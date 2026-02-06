# Room에서 나가는 것을 구현하고자 한다

기존에 구현되어 있는것들 적극 활용

## ROOM에서 나간다는 것의 의미

### React Code의 관점에서 (client side를 말하는 것)

- URL이 달라지는거니까... CSR에 의해 단순히 Render하는 component가 달라지는 것을 의미.

- 그러므로... 기존에 user가 사용하는 client app에 의해 render되어 있는 Room component가 unmount되고

- RoomList component가 render되는것임.

이것이 의미하는 바는 Room이 가지고 있던 resource가 deallocate된다는 것

#### 공식 문서에서의 API정의를 적극 활용해보기

transport도 결국 close된다는거잖아. 그러면 자동으로 producer랑 뭐 consumer랑 정리되는 그런 로직이 없을까?...라는 생각에 아래의 링크를 찾아보니

- mediasoup-client - [`transport.close()`](https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-close)
  - Closes the transport, including all its producers and consumers.
  - > This method should be called when the server side transport has been closed (and vice-versa).

- mediasoup - [`transport.close()`](https://mediasoup.org/documentation/v3/mediasoup/api/#transport-close)
  - Closes the transport. Triggers a “transportclose” event in all its producers and also “transportclose” event in all its consumers.
##### 연속적으로 발생하는 event들과 그 event listeners들을 활용해보기
> 특히 `mediasoup` 즉, nestjs에서 사용하는 서버족 mediasoup API에서의 저 transport.close()는 그 transport에서 생성되어 있는
> consumer들과 producer들에게 transportclose event를 발생시킴.
> 그런데 producer가 close되면 producerclose라는 event가 발생함.
> 이것은 즉 close되는 transport의 소유자인 peer가 produce하는 media를 consume하는 consumer들에게 producerclose event를 발생시킨다는 것.

위의 사실들은 모두 공식 documentation에 적혀있었음. 내가 직접 구현해보지는 않았지만 event listener들을 적절히 잘 등록해주면,
"transport.close()"함수 호출 하나만으로 연쇄적인... 이미 만들어진 로직들이 작동하게 하는 방식으로 simple하게 room에서 peer가 나갔을때의 어떤... 것을
구현할 수 있다고 생각.



### 서버의 관점에서
