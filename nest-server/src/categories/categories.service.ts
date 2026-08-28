import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  BatchUpdateCategoryDto,
  UpdateCategoryDto,
} from './dto/update-category.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from 'src/postgresql/schema';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject('PG_DB_BY_DRIZZLE')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userEmail: string) {
    try {
      //#region Pg
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      const { name, color } = createCategoryDto;
      const [insertedPgCategory] = await this.db
        .insert(schema.categories)
        .values({
          userId: pgUser.id,
          name,
          color,
        })
        .returning();

      console.log('CategoryInsertedBy_PG', insertedPgCategory);
      //#endregion
    } catch (error: any) {
      // PG
      if (error.code === '23505') {
        if (error.constraint === 'categories_user_id_name_unique') {
          throw new ConflictException(
            'Category with this name already exists for this user.',
          );
        }

        if (error.constraint === 'categories_user_id_is_current_unique') {
          throw new ConflictException(
            'A current category already exists for this user.',
          );
        }
      }

      console.error('[CategoriesService.create]', error);
      throw new InternalServerErrorException('Failed to create cycle setting');
    }
  }

  async update(updateCategoryDto: UpdateCategoryDto, userEmail: string) {
    try {
      const { name, data } = updateCategoryDto;

      //#region Pg
      const updatedPgCategory = await this.db.transaction(async (tx) => {
        // See src/users/README/05_row_locks_for_jsonb_read_modify_write.md.
        // This flow reads and replaces categoryChangeInfoArray, so lock the users row first.
        const [pgUser] = await tx
          .select({
            id: schema.users.id,
            categoryChangeInfoArray: schema.users.categoryChangeInfoArray,
          })
          .from(schema.users)
          .where(eq(schema.users.userEmail, userEmail))
          .for('update');

        if (!pgUser) {
          throw new Error(`PostgreSQL user not found for ${userEmail}`);
        }

        // 1) isCurrent: true 변경 요청인 경우 기존 활성 카테고리들을 false로 리셋
        if (data.isCurrent === true) {
          await tx
            .update(schema.categories)
            .set({ isCurrent: false })
            .where(eq(schema.categories.userId, pgUser.id));
        }

        // 2) 대상 카테고리 UPDATE
        const [result] = await tx
          .update(schema.categories)
          .set(data)
          .where(
            and(
              eq(schema.categories.userId, pgUser.id),
              eq(schema.categories.name, name),
            ),
          )
          .returning();

        if (!result) {
          throw new Error(
            `PostgreSQL category '${name}' not found for ${userEmail}`,
          );
        }

        // 3) name이나 color가 변경된 경우 users.categoryChangeInfoArray 세션 이력 배열 동기화
        if ('color' in data || 'name' in data) {
          const updatedCategoryArray = (
            pgUser.categoryChangeInfoArray ?? []
          ).map((info) => {
            const cloned = { ...info };
            if (cloned.categoryName === name) {
              if ('color' in data && data.color) cloned.color = data.color;
              if ('name' in data && data.name) cloned.categoryName = data.name;
            }
            return cloned;
          });

          const [updatedPgUser] = await tx
            .update(schema.users)
            .set({ categoryChangeInfoArray: updatedCategoryArray })
            .where(eq(schema.users.id, pgUser.id))
            .returning({ id: schema.users.id });

          if (!updatedPgUser) {
            throw new Error(`PostgreSQL user not found for ${userEmail}`);
          }
        }

        return result;
      });

      console.log('pg result at update category');
      console.log('--------------------------------------------------->');
      console.dir(updatedPgCategory, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.code === '23505') {
        if (error.constraint === 'categories_user_id_name_unique') {
          throw new ConflictException(
            'Category with this name already exists for this user.',
          );
        }

        if (error.constraint === 'categories_user_id_is_current_unique') {
          throw new ConflictException(
            'A current category already exists for this user.',
          );
        }
      }

      console.error('[CategoriesService.update]', error);
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  /**
   * batchUpdate: 오프라인 복구 동기화 (Offline Sync Replay)
   * 프론트엔드(errorController.ts)에서 네트워크 단절 중 발생한 여러 카테고리 수정 요청들을
   * 하나로 병합(Coalesce)하여 온라인 복구 시 PATCH /categories/batch로 일괄 전송합니다.
   */
  async batchUpdate(batchUpdateDto: BatchUpdateCategoryDto, userEmail: string) {
    // TODO: Each update currently runs independently, so earlier updates are not
    // rolled back if a later update fails. Execute the entire batch in one PostgreSQL
    // transaction if all category updates must succeed or fail together.
    await Promise.all(
      batchUpdateDto.categories.map((categoryDto) =>
        this.update(categoryDto, userEmail),
      ),
    );
  }

  async delete(name: string, userEmail: string) {
    try {
      //#region Pg
      const pgUser = await this.db.query.users.findFirst({
        where: eq(schema.users.userEmail, userEmail),
        columns: { id: true },
      });

      if (!pgUser) {
        throw new Error(`PostgreSQL user not found for ${userEmail}`);
      }

      // pomodoros.categoryId is set to null by the foreign key's ON DELETE action.
      const [deletedPgCategory] = await this.db
        .delete(schema.categories)
        .where(
          and(
            eq(schema.categories.userId, pgUser.id),
            eq(schema.categories.name, name),
          ),
        )
        .returning({
          id: schema.categories.id,
          name: schema.categories.name,
        });

      if (!deletedPgCategory) {
        throw new Error(
          `PostgreSQL category '${name}' not found for ${userEmail}`,
        );
      }

      console.log('pg result at delete category');
      console.log('--------------------------------------------------->');
      console.dir(deletedPgCategory, {
        depth: null,
        colors: true,
      });
      console.log('<---------------------------------------------------');
      //#endregion

      return;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('[CategoriesService.delete]', error);
      throw new InternalServerErrorException('Failed to delete category');
    }
  }
}
