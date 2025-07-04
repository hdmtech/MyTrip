# ChatService

- **위치**: `src/main/java/api/service/ChatService.java`
- **역할**: 채팅방 및 채팅 로그 관리 비즈니스 로직 인터페이스

## 주요 기능 및 핵심 코드

### 1. 채팅방 생성/조회/삭제/수정
```java
Long createChatRoom(String userId, String title);
List<Map<String, Object>> getChatRoomsByUser(String userId);
Map<String, Object> getChatRoomById(Long roomId);
void updateChatRoomTitle(Long roomId, String title);
void deleteChatRoom(Long roomId);
```

### 2. 채팅 로그 저장/조회
```java
void saveChatLog(Long roomId, String userId, String role, String message, String date, String time, String schedule, String region);
List<Map<String, Object>> getChatLogsByRoom(Long roomId);
```

---
- **연관 클래스**: `ChatServiceImpl`, `ChatController`
- **주요 역할**: 채팅방/로그 관리, DB 연동 