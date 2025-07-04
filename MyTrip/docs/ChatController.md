# ChatController

- **위치**: `src/main/java/com/hyservice/mytrip/controller/ChatController.java`
- **역할**: 채팅 관련 HTTP 요청을 처리하는 Spring MVC 컨트롤러

## 주요 기능 및 핵심 코드

### 1. 채팅 페이지 반환
```java
@GetMapping("/chat")
public String chatPage(Model model) {
    model.addAttribute("googleMapsApiUrl", googleMapsApiUrl);
    model.addAttribute("googleMapsApiKey", googleMapsApiKey);
    return "chat";
}
```

### 2. 채팅 메시지 전송 및 AI 응답 반환
```java
@PostMapping("/chat/send")
@ResponseBody
public Map<String, Object> sendMessage(@RequestBody Map<String, Object> payload, HttpSession session) {
    String userMessage = (String) payload.get("message");
    List<Map<String, String>> chatHistory = (List<Map<String, String>>) payload.get("chatHistory");
    // ... (roomId 처리, userName 추출 등)
    String aiReply = openAIService.getChatGPTResponseWithHistory(chatHistory, userName);
    // ... (일정 JSON 추출, DB 저장 등)
    return result;
}
```

### 3. 채팅방 목록/생성/삭제/로그 관리
```java
@GetMapping("/chat/rooms")
@ResponseBody
public Object getChatRooms(HttpSession session) { ... }

@PostMapping("/chat/room")
@ResponseBody
public Object createChatRoom(@RequestBody Map<String, String> payload, HttpSession session) { ... }

@DeleteMapping("/chat/room/{roomId}")
@ResponseBody
public Object deleteChatRoom(@PathVariable("roomId") Long roomId, HttpSession session) { ... }

@GetMapping("/chat/logs/{roomId}")
@ResponseBody
public Object getChatLogs(@PathVariable("roomId") Long roomId, HttpSession session) { ... }
```

- **연관 서비스**: `OpenAIService`, `ChatService`, `UserService`, `PlaceService`
- **주요 역할**: 채팅방 관리, AI 응답 처리, 채팅 내역 저장/조회 등 