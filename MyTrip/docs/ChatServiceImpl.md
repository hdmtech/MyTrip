# ChatServiceImpl

- **위치**: `src/main/java/api/service/impl/ChatServiceImpl.java`
- **역할**: ChatService 인터페이스의 실제 구현체, DB 연동 및 채팅방/로그 관리
- **의존성**: `ChatMapper` (MyBatis 매퍼 인터페이스)

## 주요 기능 및 핵심 코드

### 1. 채팅방 생성 (createChatRoom)
```java
@Override
public Long createChatRoom(String userId, String title) {
    Map<String, Object> param = new HashMap<>();
    param.put("user_id", userId);
    param.put("title", title);
    chatMapper.insertChatRoom(param);
    Object key = param.get("room_id");
    if (key instanceof Long) {
        return (Long) key;
    } else if (key instanceof Integer) {
        return ((Integer) key).longValue();
    } else if (key instanceof BigInteger) {
        return ((BigInteger) key).longValue();
    } else {
        return null;
    }
}
```
**상세 설명:**
- 사용자 ID와 채팅방 제목을 받아서 새로운 채팅방을 생성
- MyBatis의 `insertChatRoom`을 호출하여 DB에 채팅방 정보 저장
- **다양한 DB 타입 대응**: Long, Integer, BigInteger 타입의 room_id를 모두 처리
- 생성된 채팅방의 ID를 반환 (실패 시 null)

### 2. 채팅방 조회 (getChatRoomsByUser, getChatRoomById)
```java
@Override
public List<Map<String, Object>> getChatRoomsByUser(String userId) {
    return chatMapper.selectChatRoomsByUser(userId);
}

@Override
public Map<String, Object> getChatRoomById(Long roomId) {
    return chatMapper.selectChatRoomById(roomId);
}
```
**상세 설명:**
- `getChatRoomsByUser`: 특정 사용자의 모든 채팅방 목록 조회
- `getChatRoomById`: 특정 채팅방의 상세 정보 조회
- MyBatis 매퍼를 통해 DB에서 데이터 조회

### 3. 채팅방 수정/삭제 (updateChatRoomTitle, deleteChatRoom)
```java
@Override
public void updateChatRoomTitle(Long roomId, String title) {
    Map<String, Object> param = new HashMap<>();
    param.put("room_id", roomId);
    param.put("title", title);
    chatMapper.updateChatRoomTitle(param);
}

@Override
public void deleteChatRoom(Long roomId) {
    chatMapper.deleteChatRoom(roomId);
}
```
**상세 설명:**
- `updateChatRoomTitle`: 채팅방 제목 변경
- `deleteChatRoom`: 채팅방 삭제 (연관된 채팅 로그도 함께 삭제됨)

### 4. 채팅 로그 저장 (saveChatLog)
```java
@Override
public void saveChatLog(Long roomId, String userId, String role, String message, String date, String time, String schedule, String region) {
    Map<String, Object> param = new HashMap<>();
    param.put("room_id", roomId);
    param.put("user_id", userId);
    param.put("role", role);
    param.put("message", message);
    param.put("schedule", schedule);
    param.put("region", region);
    param.put("date", date);
    param.put("time", time);
    chatMapper.insertChatLog(param);
    chatMapper.updateChatRoomUpdatedAt(roomId);
}
```
**상세 설명:**
- **채팅 로그 저장**: 사용자/AI 메시지, 일정 JSON, 지역 정보 등을 DB에 저장
- **파라미터 설명**:
  - `role`: "user" 또는 "assistant" (사용자/AI 구분)
  - `schedule`: AI가 생성한 일정 JSON 데이터
  - `region`: 여행 지역명 (예: "제주도")
- **트랜잭션 처리**: 로그 저장 후 채팅방의 `updated_at` 시간도 함께 업데이트

### 5. 채팅 로그 조회 (getChatLogsByRoom)
```java
@Override
public List<Map<String, Object>> getChatLogsByRoom(Long roomId) {
    return chatMapper.selectChatLogsByRoom(roomId);
}
```
**상세 설명:**
- 특정 채팅방의 모든 대화 내역을 시간순으로 조회
- 사용자 메시지와 AI 응답이 모두 포함됨

### 6. 채팅방 업데이트 시간 갱신 (updateChatRoomUpdatedAt)
```java
@Override
public void updateChatRoomUpdatedAt(Long roomId) {
    chatMapper.updateChatRoomUpdatedAt(roomId);
}
```
**상세 설명:**
- 채팅방의 마지막 활동 시간을 현재 시간으로 업데이트
- 채팅방 목록에서 최신 순으로 정렬할 때 사용

## 데이터 흐름
1. **채팅방 생성** → DB에 채팅방 정보 저장 → room_id 반환
2. **메시지 전송** → 채팅 로그 저장 → 채팅방 업데이트 시간 갱신
3. **채팅 내역 조회** → DB에서 로그 조회 → 시간순 정렬하여 반환

## 예외 처리
- DB 연결 실패, SQL 오류 등은 상위 레이어(ChatController)에서 처리
- room_id 타입 불일치 시 null 반환으로 안전 처리

---
- **연관 클래스**: `ChatService` (인터페이스), `ChatController`, `ChatMapper` (MyBatis)
- **주요 역할**: DB 연동, 채팅방/로그 CRUD 작업, 트랜잭션 관리 