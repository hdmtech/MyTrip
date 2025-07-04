package com.hyservice.mytrip.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import com.hyservice.mytrip.service.OpenAIService;
import com.hyservice.mytrip.service.PlaceService;

import api.service.UserService;
import api.service.ChatService;

import java.util.*;
import java.util.regex.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import java.util.LinkedHashMap;
import jakarta.servlet.http.HttpSession;

@Controller
public class ChatController {

    @Autowired
    private OpenAIService openAIService;
    @Autowired
    private UserService userService;
    @Autowired
    private PlaceService placeService;
    @Autowired
    private ChatService chatService;

    @Value("${google.maps.api.url}")
    private String googleMapsApiUrl;
    @Value("${google.maps.api.key}")
    private String googleMapsApiKey;

    @GetMapping("/chat")
    public String chatPage(Model model) {
        model.addAttribute("googleMapsApiUrl", googleMapsApiUrl);
        model.addAttribute("googleMapsApiKey", googleMapsApiKey);
        return "chat";
    }

    @PostMapping("/chat/send")
    @ResponseBody
    public Map<String, Object> sendMessage(@RequestBody Map<String, Object> payload, HttpSession session) {
        String userMessage = (String) payload.get("message");
        List<Map<String, String>> chatHistory = (List<Map<String, String>>) payload.get("chatHistory");
        Long roomId = null;
        
        // roomId가 있으면 Long으로 변환
        Object roomIdObj = payload.get("roomId");
        if (roomIdObj != null) {
            if (roomIdObj instanceof Number) {
                roomId = ((Number) roomIdObj).longValue();
            } else if (roomIdObj instanceof String) {
                try {
                    roomId = Long.parseLong((String) roomIdObj);
                } catch (NumberFormatException e) {
                    // roomId가 숫자가 아닌 경우 (예: temp_xxx) 무시
                }
            }
        }

        // user 메시지 추가
        chatHistory.add(Map.of("role", "user", "content", userMessage));

        // 사용자명 세션에서 추출
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";

        // AI 응답 생성
        String aiReply = openAIService.getChatGPTResponseWithHistory(chatHistory, userName);

        // 일정 안내/JSON 영역 삭제
        String aiReplyForChat = aiReply;
        // 1. ***일정***, [***일정***], ***일정***(여행지), [***일정***(여행지)] 모두 제거
        aiReplyForChat = aiReplyForChat.replaceAll("\\[?\\*{3}일정\\*{3}(\\([^)]*\\))?\\]?", "");
        // 2. ***JSON*** ~ ***JSON*** 블록 삭제 (여러 개 있을 수 있으니 반복)
        aiReplyForChat = aiReplyForChat.replaceAll("\\*\\*\\*JSON\\*\\*[\\s\\S]*?\\*\\*\\*JSON\\*\\*\\*", "");
        // 3. "1:", "2:", "3:" 같은 순번 제거
        aiReplyForChat = aiReplyForChat.replaceAll("\\d+\\s*:\\s*", "");
        // 4. 앞뒤 공백/줄바꿈 정리
        aiReplyForChat = aiReplyForChat.replaceAll("^[\\s\\n]+|[\\s\\n]+$", "");
        aiReplyForChat = aiReplyForChat.replaceAll("(\\n\\s*){3,}", "\\n\\n");

        // assistant 메시지 추가
        chatHistory.add(Map.of("role", "assistant", "content", aiReply));

        // AI가 실제로 일정을 작성한 답변인지 확인 (***일정*** 포함 여부만 체크)
        boolean isScheduleResponse = aiReply.contains("***일정***");
        
        // 일정 JSON 추출 및 photoUrl 포함 저장
        String scheduleJson = null;
        Object schedule = null;
        if (isScheduleResponse) {
            Pattern jsonPattern = Pattern.compile("\\*\\*\\*JSON\\*\\*\\*([\\s\\S]*?)\\*\\*\\*JSON\\*\\*");
            Matcher jsonMatcher = jsonPattern.matcher(aiReply);
            if (jsonMatcher.find()) {
                String rawJson = jsonMatcher.group(1).trim();
                // 작은따옴표 → 큰따옴표
                String jsonStr = rawJson.replace('\'', '"');
                // '1일차: \n' → "1일차":
                jsonStr = jsonStr.replaceAll("\"(\\d+일차):\\s*\\n", "\"$1\":");
                // order: "1" → order: 1
                jsonStr = jsonStr.replaceAll("\"order\"\\s*:\\s*\"(\\d+)\"", "\"order\": $1");
                // xy: "126.493, 33.505" → [126.493, 33.505]
                jsonStr = jsonStr.replaceAll("\"xy\"\\s*:\\s*\"([0-9.\\-]+),\\s*([0-9.\\-]+)\"", "\"xy\": [$1, $2]");
                try {
                    // 1. 일정 JSON 파싱
                    org.json.JSONObject scheduleObj = new org.json.JSONObject(jsonStr);
                    // 2. 각 장소에 photoUrl 추가
                    for (String dayKey : scheduleObj.keySet()) {
                        org.json.JSONArray dayArr = scheduleObj.getJSONArray(dayKey);
                        for (int i = 0; i < dayArr.length(); i++) {
                            org.json.JSONObject place = dayArr.getJSONObject(i);
                            String name = place.optString("name");
                            String address = place.optString("address");
                            org.json.JSONArray xy = place.optJSONArray("xy");
                            Double lon = null, lat = null;
                            if (xy != null && xy.length() == 2) {
                                lon = xy.getDouble(0);
                                lat = xy.getDouble(1);
                            }
                            String photoUrl = placeService.getPlacePhotoUrl(lat, lon, address, name);
                            place.put("photoUrl", photoUrl);
                        }
                    }
                    // 3. 다시 JSON 문자열로 변환
                    scheduleJson = scheduleObj.toString();
                    // 4. 프론트로 내려줄 schedule 객체도 생성
                    schedule = jsonObjectToLinkedMap(scheduleObj);
                } catch (Exception e) {
                    schedule = null;
                    scheduleJson = null;
                }
            }
        }
        
        // 지역명 추출
        Pattern regionPattern = Pattern.compile("\\[?\\*{3}일정\\*{3}\\(([^)]*)\\)\\]?");
        Matcher regionMatcher = regionPattern.matcher(aiReply);
        String region = null;
        if (regionMatcher.find()) {
            region = regionMatcher.group(1);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("reply", aiReply);
        result.put("replyForChat", aiReplyForChat);
        result.put("schedule", schedule);
        result.put("region", region);

        // AI 응답을 DB에 저장 (roomId가 있을 때만)
        if (roomId != null) {
            try {
                java.time.LocalDate today = java.time.LocalDate.now();
                String dateStr = today.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
                String timeStr = java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
                chatService.saveChatLog(roomId, userName, "assistant", aiReplyForChat, dateStr, timeStr, scheduleJson, region);
            } catch (Exception e) {
                // chat_log 저장 실패 시에도 응답은 정상 반환
            }
        }

        // AI 응답 전체 로그 출력
        System.out.println("[AI 응답 로그]");
        System.out.println("aiReply: " + aiReply);
        System.out.println("aiReplyForChat: " + aiReplyForChat);
        System.out.println("scheduleJson: " + scheduleJson);
        System.out.println("region: " + region);

        return result;
    }

    // JSONObject를 LinkedHashMap으로 변환 (순서 보장)
    private static Map<String, Object> jsonObjectToLinkedMap(JSONObject jsonObj) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (String key : jsonObj.keySet()) {
            Object value = jsonObj.get(key);
            if (value instanceof JSONObject) {
                map.put(key, jsonObjectToLinkedMap((JSONObject) value));
            } else if (value instanceof JSONArray) {
                map.put(key, jsonArrayToList((JSONArray) value));
            } else {
                map.put(key, value);
            }
        }
        return map;
    }

    private static List<Object> jsonArrayToList(JSONArray array) {
        List<Object> list = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            Object value = array.get(i);
            if (value instanceof JSONObject) {
                list.add(jsonObjectToLinkedMap((JSONObject) value));
            } else if (value instanceof JSONArray) {
                list.add(jsonArrayToList((JSONArray) value));
            } else {
                list.add(value);
            }
        }
        return list;
    }

    // 로그인 사용자만 채팅방 목록 반환
    @GetMapping("/chat/rooms")
    @ResponseBody
    public Object getChatRooms(HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Collections.emptyList();
        }
        return chatService.getChatRoomsByUser(userName);
    }

    // 채팅방 생성
    @PostMapping("/chat/room")
    @ResponseBody
    public Object createChatRoom(@RequestBody Map<String, String> payload, HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Map.of("error", "게스트는 사용할 수 없습니다.");
        }
        String title = payload.getOrDefault("title", "새 대화");
        Long roomId = chatService.createChatRoom(userName, title);
        return Map.of("room_id", roomId);
    }

    // 채팅방별 대화 내역 반환
    @GetMapping("/chat/logs/{roomId}")
    @ResponseBody
    public Object getChatLogs(@PathVariable("roomId") Long roomId, HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Collections.emptyList();
        }
        
        // 채팅 메시지 목록
        List<Map<String, Object>> messages = chatService.getChatLogsByRoom(roomId);
        
        // schedule 컬럼에서 JSON 파싱하여 반환
        for (Map<String, Object> message : messages) {
            Object scheduleObj = message.get("schedule");
            if (scheduleObj != null && scheduleObj instanceof String) {
                String scheduleJson = (String) scheduleObj;
                try {
                    // JSON 파싱 시도
                    Object schedule = jsonObjectToLinkedMap(new org.json.JSONObject(scheduleJson));
                    message.put("schedule", schedule);
                } catch (Exception e) {
                    // 파싱 실패 시 원본 문자열 유지
                }
            }
        }
        
        return Map.of("messages", messages);
    }

    // 채팅방 삭제
    @DeleteMapping("/chat/room/{roomId}")
    @ResponseBody
    public Object deleteChatRoom(@PathVariable("roomId") Long roomId, HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Map.of("error", "게스트는 사용할 수 없습니다.");
        }
        chatService.deleteChatRoom(roomId);
        return Map.of("result", "ok");
    }

    // 채팅방별 대화 저장
    @PostMapping("/chat/logs/{roomId}")
    @ResponseBody
    public Object saveChatLog(@PathVariable("roomId") String roomId, @RequestBody Map<String, Object> payload, HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Map.of("error", "게스트는 사용할 수 없습니다.");
        }
        String role = payload.getOrDefault("role", "user").toString();
        String message = payload.getOrDefault("message", "").toString();
        String schedule = payload.getOrDefault("schedule", null) != null ? payload.getOrDefault("schedule", null).toString() : null;
        String region = payload.getOrDefault("region", null) != null ? payload.getOrDefault("region", null).toString() : null;
        String date = payload.getOrDefault("date", null) != null ? payload.getOrDefault("date", null).toString() : null;
        String time = payload.getOrDefault("time", null) != null ? payload.getOrDefault("time", null).toString() : null;
        // 임시 채팅방(temp_...)은 저장하지 않음
        try {
            Long roomIdLong = Long.parseLong(roomId);
            chatService.saveChatLog(roomIdLong, userName, role, message, date, time, schedule, region);
        } catch (NumberFormatException e) {
            // 임시방 등 roomId가 Long이 아닐 때는 저장하지 않음
        }
        return Map.of("result", "ok");
    }

    // 채팅방 제목 업데이트
    @PutMapping("/chat/room/{roomId}/title")
    @ResponseBody
    public Object updateChatRoomTitle(@PathVariable("roomId") Long roomId, @RequestBody Map<String, String> payload, HttpSession session) {
        String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : "";
        if (userName.isEmpty() || userName.equals("guest")) {
            return Map.of("error", "게스트는 사용할 수 없습니다.");
        }
        String title = payload.getOrDefault("title", "");
        if (title.isEmpty()) {
            return Map.of("error", "제목이 비어있습니다.");
        }
        chatService.updateChatRoomTitle(roomId, title);
        return Map.of("result", "ok");
    }
} 