package api.service;

import java.util.List;
import java.util.Map;

public interface ChatService {
    Long createChatRoom(String userId, String title);
    List<Map<String, Object>> getChatRoomsByUser(String userId);
    Map<String, Object> getChatRoomById(Long roomId);
    void updateChatRoomTitle(Long roomId, String title);
    void deleteChatRoom(Long roomId);

    void saveChatLog(Long roomId, String userId, String role, String message, String date, String time, String schedule, String region);
    List<Map<String, Object>> getChatLogsByRoom(Long roomId);

    void updateChatRoomUpdatedAt(Long roomId);
} 