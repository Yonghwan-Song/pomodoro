# 그냥

## index 쓰는 이유 -

```tsx
type NameInputChange = {
  index: string;
  name: string;
};
type ColorInputChange = {
  index: string;
  color: string;
};
```

- `categoriesFromServer`에서 name을 찾아내기 위해. (`categoriesInputs`는 계속 바뀌니까)
- `categoriesFromServer`는 context로 받은것인데 아직 기존 name을 그대로 가지고 있음.
- 그래서 이것을 이용해서 서버에서 query하는데 사용할 것임.
  e.g)

```tsx
useEffect(() => {
  if (debouncedColorInputChange !== null) {
    axiosInstance.patch(RESOURCE.CATEGORIES, {
      name: categoriesFromServer[parseInt(debouncedColorInputChange.index)] //<-----
        .name, //<------------------------------------------------------------------
      data: { color: debouncedColorInputChange?.color },
    });
    setDebouncedColorInputChange(null);
  }
}, [debouncedColorInputChange]);
```
