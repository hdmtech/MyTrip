package api.service.impl;

import api.mapper.ChatMapper;
import api.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatServiceImpl implements ChatService {
    @Autowired
    private ChatMapper chatMapper;

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

    @Override
    public List<Map<String, Object>> getChatRoomsByUser(String userId) {
        return chatMapper.selectChatRoomsByUser(userId);
    }

    @Override
    public Map<String, Object> getChatRoomById(Long roomId) {
        return chatMapper.selectChatRoomById(roomId);
    }

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

    @Override
    public List<Map<String, Object>> getChatLogsByRoom(Long roomId) {
        return chatMapper.selectChatLogsByRoom(roomId);
    }

    @Override
    public void updateChatRoomUpdatedAt(Long roomId) {
        chatMapper.updateChatRoomUpdatedAt(roomId);
    }
} 