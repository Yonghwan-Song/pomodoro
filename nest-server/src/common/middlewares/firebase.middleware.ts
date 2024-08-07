import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface CustomRequest extends Request {
  userEmail?: string;
}

export async function FireBase_Admin_Middleware(
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) {
  const authorizationHeader = req.headers.authorization;
  // console.log('authorizationHeader');
  // console.log(authorizationHeader);
  if (authorizationHeader) {
    const idToken = req.headers.authorization.split(' ')[1]; // 'Bearer tokenValue' -> [1] of arr [Bearer, tokenValue]
    try {
      const decodeValue = await admin.auth().verifyIdToken(idToken);
      // console.log(
      //   '----------------------------------decodeValue------------------------------------',
      // );
      // console.log(decodeValue);
      // console.log(
      //   '---------------------------------------------------------------------------------',
      // );
      if (decodeValue) {
        // console.log(
        //   '----------------------------------decodeValue.email------------------------------------',
        // );
        // console.log(decodeValue.email);
        // console.log(
        //   '---------------------------------------------------------------------------------------',
        // );
        req.userEmail = decodeValue.email;
        return next();
      }
    } catch (error) {
      throw new HttpException(`${error.message}`, HttpStatus.UNAUTHORIZED);
    }
  }

  throw new HttpException(
    'Authorization header is undefined',
    HttpStatus.UNAUTHORIZED,
  );
}
