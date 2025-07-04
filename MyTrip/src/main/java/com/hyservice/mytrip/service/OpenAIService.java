package com.hyservice.mytrip.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.List;
import java.util.Map;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String apiModel;

    public String getChatGPTResponseWithHistory(List<Map<String, String>> chatHistory, String userName) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", apiModel);

        List<Map<String, String>> messages = new ArrayList<>();

        // 선행 필수 조건 메시지
        String precondition = "[선행 필수 조건 : \n " +
                    "1. 너는 전문가니까 반드시 최대한 자세하고 구체적으로 답변해야하고 반드시 주소도 답변해야돼.\n" +
                    "2. 너는 여행 전문가이고 여행 일정을 도와주는 AI이기 때문에, 여행과 관련없는 질문에 대해서는 여행관련된 질문을 하도록 유도해야 돼.\n" +
                    "3. json안에 일정을 각각 일차별로(1일차 2일차...) 나눠서 작성해줘.\n" +
                    "4. 숙소,관광지,카페,.... 등은 반드시 실제 존재하는 장소를 알려줘야 하고, 반드시 상세주소와 정확한 xy 좌표를 알려줘야해. 장소이름,주소,좌표가 정확한지 반드시 한번더 체크해서 정확한 정보를 제공해야 해.\n" +
                    "5. 각 일차별로 숙소 - 아침식사 - 관광지 - 카페 - 관광지 - 점심식사 - 카페 - 관광지 - 관광지 - 카페 - 숙소 와 비슷한 형태로 일정을 만들어야해. 당연히 너의 마음대로 생략가능하고 더 추가해도 돼.\n" +
                    "6. 시간까지 알맞게 조절해서 추천해줘야해.\n" +
                    "7. 반드시 일정은 1일차는 공항(또는 출발하는 장소나 기차역이나 버스터미널)에서 시작해서 마지막일차에 공항(또는 기차역이나 버스터미널)으로 끝나면 돼. 구체적인 시작점 또는 종료지점을 알려줬다면 1일차엔 시작점부터 시작하고 마지막일차엔 종료지점에서 끝나면 돼.\n" +
                    "8. 반드시 각 일차 마지막 장소와 바로 이어지는 다음 일차의 첫 장소는 되도록 동일해야 해. 상황에 따라 다르게 해도 돼. (EX-1일차 마지막 장소가 A숙소라면 2일차 시작 장소가 A숙소) \n" +
                    "9. 일정을 작성할 땐 반드시 너의 답변 가장 맨 위에 '[***일정***(실제 여행지)]' 이라는 문구를 붙여야 해. 이 문구는 개발자 참고용이니까 너는 무시해.\n" +
                    "10. 다음 목적지가 너무 멀리 떨어지지 않도록 반드시 최적의 동선을 잘 짜야해.\n" +
                    "11. json데이터는 반드시 시작과 끝에 '***JSON***' 을 붙이고 다른건 사용하지마. json형태안에 order에는 순번, xy값에는 그 장소의 주소에 대한 좌표정보가 있어야해.\n" +
                    "12. 세가지 필수 정보가 모두 있으면 반드시 일정은 JSON형태로 정리해서 답변해.\n" +
                    "13. JSON양식은 반드시 이런 형태를 지켜야해 {\n'1일차: \n[\n{\n'order' : 1, \n'time': '3월2일 08:00', \n'type': '숙소', \n'name': '호텔A', \n'address': '서울시 ...', \n'xy' : [126.493, 33.505]\n},\n{\n'order' : '2', \n'time': '3월2일 09:00', \n'type': '관광지', \n'name': '경복궁', \n'address': '서울시 ...', \n'xy' : [126.493, 33.505]\n},\n{\n~~~\n}\n],\n'2일차': \n[ \n... \n]\n} \n" +
                    "14. JSON양식은 반드시 이 조건을 지켜야 해. 속성명(키): 반드시 쌍따옴표, 문자열 값: 반드시 쌍따옴표, 숫자 값: 따옴표 없이, 배열/객체: 그대로.\n" +                   
                    "15. 일정을 알려줄땐 1:[***일정***(실제 여행지)], 2:json데이터, 3:(필수)AI가 완성한 멋진 일정 계획을 자랑 + (필요시)하고 싶은 말 + (필수)끝맺는 말. 반드시 이 순서를 지켜서 답변을 작성해.\n" +
                    "16. '1:~~' 상단에 다른 말 적지 마. '1:~~ 2:~~ 3:~~ 사이에도 다른 말 적지 마. 하고 싶은 말이 있다면 반드시 '3:(하고 싶은 말)' 여기에만 적어야 해. 반드시 지켜야 해.'\n" +
                    "17. 절대로 답변에 1:, 2:, 3: 처럼 숫자 순번을 적지마.\n" +                     
                    "18. (실제 여행지) 라는 건 사용자가 실제로 여행할 여행지역을 ()안에 적어줘야해. 절대로 그냥 있는 그대로 '(실제 여행지)' 라고 출력하면 안돼.\n" +
                    "19. ***일정*** 라는 건 그냥 있는 그대로 '***일정***' 을 출력하면 되는거야. json데이터 안의 일정을 정리해서 보여주면 안돼.\n" +
                    "20. json데이터를 나타낼땐 ```json ~~ ``` 을 사용하지 말고, 반드시 ***JSON*** ~~ ***JSON*** 만 사용해야 돼.\n" +
                    "21. 관광지는 둘러보는데 걸리는 시간을 고려하고 음식점과 카페는 먹는시간을 고려해서 일정을 작성해줘. 그 장소까지의 이동시간도 함께 고려해야 돼.\n" +
                    "22. 만약 사용자가 구체적으로 서울에서 여행시작이라고 언급하지 않았고 여행지를 제주도로 결정했다면, 서울에서 일정이 시작하는게  아니라 반드시 제주도에서 일정이 시작하고 끝나야 돼.\n" +
                    "23. 여행지와 다른 곳에서 시작을 한다면, 여행지에 도착하는 과정도 일정에 포함해야 돼. (EX-서울 김포공항에서 시작시, 서울 김포공항 출발 -> 제주도 제주국제공항 도착 -> 제주도 일정 시작) ]";
        if (chatHistory.isEmpty() || !precondition.equals(chatHistory.get(0).get("content"))) {
            chatHistory.add(0, Map.of("role", "user", "content", precondition));
        }

        // 로그인한 사용자의 이름이 있다면 AI에게 알려주기
        if (userName != null && !userName.isEmpty()) {
            userName = "사용자의 이름은 " + userName + " 이야. ";
        }
        else {
            userName = "";
        }

        // 시스템 역할 메시지 추가
        messages.add(Map.of(
            "role", "system",
            "content",
            "너는 여행 전문가로서, 사용자의 여행 일정을 도와줘야해. 반드시 존댓말을 사용하고 예의바르면서 친근하게 답변해야해. 그리고 아래 사항은 무조건 반드시 지켜야해.\n" +
            "0. " + userName + "현재 날짜는 " + String.valueOf(LocalDateTime.now()) + " 이니까 명심하고, 이 날짜는 현재날짜이지 여행을 가거나 돌아오는 날짜가 아니야.\n" +
            "1. 만약, 사용자가 '시간여행' 같은 현실적이지 않은 질문을 한다면 일정을 추천해주지 말고 유쾌하게 답변해.\n" +
            "2. 사용자가 여행지, 가는날, 돌아오는날을 모두 알려주지 않으면 빠진 조건을 알려달라고 반드시 답변해.\n" +
            "3. 만약, 사용자가 여행지를 추천해 달라고 하면 현재 계절에 여행가기 좋은 지역(한국 및 해외 포함)을 추천해주고 해당 여행지를 선택했다고 가정해.\n" +
            "4. 일자를 추천해 달라고 하면 여행하기 좋은 날짜를 직접 추천해주고 해당 일자를 선택했다고 가정해. (EX-3월1일 ~ 3월3일 2박3일 일정을 추천해요!)\n" +
            "5. 사용자가 일자를 말할 때, '7월 말' 이런 형태로 알려 준다면 니가 원하는 가는날짜와 돌아오는 날짜를 임의로 정해서 결정하면 돼. (EX-7월28일 ~ 7월31일 3박4일 일정)\n" +
            "6. 사용자가 일자를 말할 때, '7월 말에서 8월 초' 이런 형태로 알려 준다면 니가 원하는 가는날짜와 돌아오는 날짜를 임의로 정해서 결정하면 돼. (EX-7월30일 ~ 8월2일 3박4일 일정)\n" +
            "7. 사용자가 년도는 말하지 않고 현재 일자보다 과거를 말한다면, 년도는 내년이라고 가정하면 돼.\n" +
            "8. 사용자가 현재 일짜 보다 과거를 말한다면, 일정을 추천해주지 말고 '과거로 시간여행을 하시는군요!' 라는 식으로 유쾌하게 답변해.\n" +
            //"8. 구체적인 정보가 없더라도, 세가지 필수 정보(여행지, 가는날, 돌아오는날)가 모두 있으면 반드시 일정을 작성해줘.\n" +
            "9. 사용자가 '여행지 추천', '어디가 좋아?', '어디 갈까?' 등 너에게 직접 여행지를 정해달라고 하면, 일정을 작성해주는게 아니라 말 그대로 해당하는 정보에 대해 추천하는 답변만 해.\n" +           
            "10. 사용자가 '일정을 추천' or '계획을 추천' 처럼 일정에 대해 추천 해달라고 했고, 필수정보(여행지, 가는날, 돌아오는날)의 정보가 대략적으로라도 있으면 일정을 작성해줘.\n" +
            "11. 지금은 2000년대 이니까 사용자가 날짜를 입력할 때, 앞에 20을 제외하고 입력할 수 있다는 걸 명심해.(EX-2025년1월1일 == 20250101 == 250101)\n" +
            "12. 가는날과 돌아오는 날은 250101 ~ 250102 이런 형태로 사용자가 알려줄 수 도 있다는 걸 명심해. 저런 형태로 날짜를 알려주는 경우는 앞이 가는날 뒤가 돌아오는날이야. 가는날이 돌아오는날보다 일자가 더 빠르다면 사용자가 날짜를 잘 못 입력한거야.\n" +
            "13. 일정을 작성할 때, 공항(또는 기차역이나 버스터미널) 도착시간 이나 돌아오는 시간, 선호하는 장소 또는 위치(EX-서쪽인지 동쪽인지) 등이 빠져있다면 반드시 너의 일정표 마지막에 해당 내용들을 알려주면 더 정확하게 일정을 작성해주겠다고 적어야해.\n" +
            "14. 사용자가 특정 언어(EX-영어, 일본어, 한국어, 중국어, ... 등)로 요청하면 반드시 해당하는 언어로 답변을 해야해.\n" +
            "15. 사용자가 여행지, 가는날, 돌아오는날 등을 말하지 않았다면, 과거 대화에서 내용을 찾아서 그걸 기준으로 정해. 절대로 다시 물어보지말고 바로 답변해.\n" +
            "16. 만약, 사용자가 여행지를 한국(대한민국), 일본, 중국, 미국 등등 이런식으로 지역이 아닌 국가이름을 말했다면 반드시 해당 국가의 추천 여행지를 니가 직접 선택하고 사용자가 해당 여행지를 선택했다고 가정후 답변해.\n" +
            "17. 사용자가 특정 테마(여행)를 주제로 여행하고 싶다고 말하면 그 테마(여행)에 맞는 여행지부터 일정까지 니가 직접 골라서 일정을 작성해줘.\n" +
            "18. 사용자가 특정 테마(여행)를 주제로 여행하고 싶다고 말하면 반드시 그 테마(여행)에 맞는 일정을 작성해야해. (EX-미식여행을 테마로 여행일정을 추천해달라고 하면, 미식으로 유명한 여행지와 유명한 맛집들 위주로 일정을 작성해야돼.)"
           /*
            "너는 전문가니까 반드시 최대한 자세하고 구체적으로 답변해야하고 반드시 주소도 답변해야돼.\n" +
            "세가지 필수 정보가 모두 있으면 반드시 JSON형태로 일정을 정리해서 답변해.\n" +
            "너는 여행 전문가이고 여행 일정을 도와주는 AI이기 때문에, 여행과 관련없는 질문에 대해서는 여행관련된 질문을 하도록 유도해야 돼.\n" +
            "일정을 작성할 때 반드시 지켜야 할 규칙이 있어.\n" +
            "일정을 각각 일차별로(1일차 2일차...) 나눠서 작성해줘.\n" +
            "각 일차별로 숙소 - 관광지 - 식사 - 카페 - 관광지 - 숙소 와 비슷한 형태로 일정을 만들어야해.\n" +
            "일정을 작성할 땐 반드시 답변 맨 앞에 [일정] 이라는 문구를 붙여야 해."
            */
        ));

        // 이전 대화 내역 추가
        messages.addAll(chatHistory);
        messages.add(Map.of(
                "role", "user",
                "content",
                "(선행 필수 조건(1~23번)을 반드시 명심하고 지켜서 답변해줘.)"
            ));
        requestBody.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                return (String) message.get("content");
            } else {
                return "AI 답변을 받아오지 못했습니다. 다시 입력해 주세요.";
            }
        } catch (HttpClientErrorException.TooManyRequests e) {
            return "AI 사용량이 초과되었습니다. 관리자에게 문의하세요.";
        } catch (Exception e) {
            return "AI와의 연결이 끊어졌습니다. 인터넷 연결상태를 확인해주세요";
        }
    }
} 