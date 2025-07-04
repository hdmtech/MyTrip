package api.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface ChatMapper {
    int insertChatRoom(Map<String, Object> param);
    List<Map<String, Object>> selectChatRoomsByUser(@Param("user_id") String userId);
    Map<String, Object> selectChatRoomById(@Param("room_id") Long roomId);
    int updateChatRoomTitle(Map<String, Object> param);
    int deleteChatRoom(@Param("room_id") Long roomId);

    int insertChatLog(Map<String, Object> param);
    List<Map<String, Object>> selectChatLogsByRoom(@Param("room_id") Long roomId);

    int updateChatRoomUpdatedAt(@Param("room_id") Long roomId);
} 