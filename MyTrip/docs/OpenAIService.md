# OpenAIService

- **위치**: `src/main/java/com/hyservice/mytrip/service/OpenAIService.java`
- **역할**: OpenAI API와 연동하여 AI 답변(여행 일정 등) 생성
- **의존성**: OpenAI GPT-4 API, RestTemplate

## 주요 기능 및 핵심 코드

### 1. 대화 이력 기반 AI 응답 생성 (getChatGPTResponseWithHistory)
```java
public String getChatGPTResponseWithHistory(List<Map<String, String>> chatHistory, String userName) {
    RestTemplate restTemplate = new RestTemplate();
    Map<String, Object> requestBody = new HashMap<>();
    requestBody.put("model", apiModel);
    List<Map<String, String>> messages = new ArrayList<>();
    
    // 선행 필수 조건 메시지 추가
    String precondition = "[선행 필수 조건 : \n " +
        "1. 너는 전문가니까 반드시 최대한 자세하고 구체적으로 답변해야하고 반드시 주소도 답변해야돼.\n" +
        "2. 너는 여행 전문가이고 여행 일정을 도와주는 AI이기 때문에, 여행과 관련없는 질문에 대해서는 여행관련된 질문을 하도록 유도해야 돼.\n" +
        // ... (총 23개 규칙)
        "23. 여행지와 다른 곳에서 시작을 한다면, 여행지에 도착하는 과정도 일정에 포함해야 돼. (EX-서울 김포공항에서 시작시, 서울 김포공항 출발 -> 제주도 제주국제공항 도착 -> 제주도 일정 시작) ]";
    
    // 시스템 역할 메시지 추가
    messages.add(Map.of(
        "role", "system",
        "content",
        "너는 여행 전문가로서, 사용자의 여행 일정을 도와줘야해. 반드시 존댓말을 사용하고 예의바르면서 친근하게 답변해야해. 그리고 아래 사항은 무조건 반드시 지켜야해.\n" +
        "0. " + userName + "현재 날짜는 " + String.valueOf(LocalDateTime.now()) + " 이니까 명심하고, 이 날짜는 현재날짜이지 여행을 가거나 돌아오는 날짜가 아니야.\n" +
        // ... (총 18개 시스템 규칙)
        "18. 사용자가 특정 테마(여행)를 주제로 여행하고 싶다고 말하면 반드시 그 테마(여행)에 맞는 일정을 작성해야해. (EX-미식여행을 테마로 여행일정을 추천해달라고 하면, 미식으로 유명한 여행지와 유명한 맛집들 위주로 일정을 작성해야돼.)"
    ));
    
    // 이전 대화 내역 추가
    messages.addAll(chatHistory);
    messages.add(Map.of(
        "role", "user",
        "content",
        "(선행 필수 조건(1~23번)을 반드시 명심하고 지켜서 답변해줘.)"
    ));
    
    requestBody.put("messages", messages);
    
    // OpenAI API 호출
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
```

**상세 설명:**
- **목적**: 사용자의 여행 요청에 대해 AI가 구조화된 일정을 생성
- **입력 파라미터**:
  - `chatHistory`: 이전 대화 내역 (role, content 포함)
  - `userName`: 사용자 이름 (개인화된 응답을 위해)
- **처리 과정**:
  1. **선행 필수 조건 추가**: 23개의 상세한 규칙을 첫 번째 메시지로 추가
  2. **시스템 역할 메시지**: AI의 역할과 행동 규칙 정의
  3. **대화 내역 추가**: 이전 대화 내용을 컨텍스트로 활용
  4. **OpenAI API 호출**: GPT-4 모델로 요청 전송
  5. **응답 처리**: 성공/실패에 따른 적절한 응답 반환

### 2. 프롬프트 엔지니어링 구조

#### A. 선행 필수 조건 (23개 규칙)
```java
String precondition = "[선행 필수 조건 : \n " +
    "1. 너는 전문가니까 반드시 최대한 자세하고 구체적으로 답변해야하고 반드시 주소도 답변해야돼.\n" +
    "2. 너는 여행 전문가이고 여행 일정을 도와주는 AI이기 때문에, 여행과 관련없는 질문에 대해서는 여행관련된 질문을 하도록 유도해야 돼.\n" +
    "3. json안에 일정을 각각 일차별로(1일차 2일차...) 나눠서 작성해줘.\n" +
    "4. 숙소,관광지,카페,.... 등은 반드시 실제 존재하는 장소를 알려줘야 하고, 반드시 상세주소와 정확한 xy 좌표를 알려줘야해.\n" +
    // ... (총 23개 규칙)
    "23. 여행지와 다른 곳에서 시작을 한다면, 여행지에 도착하는 과정도 일정에 포함해야 돼. ]";
```

**주요 규칙 카테고리:**
- **정보 정확성**: 실제 존재하는 장소, 정확한 주소/좌표
- **일정 구조화**: 일차별 분류, JSON 형태 출력
- **동선 최적화**: 효율적인 경로, 연속성 보장
- **시간 현실성**: 체류 시간, 이동 시간 고려
- **출발/도착점**: 공항/기차역/버스터미널 기준
- **출력 형식**: ***JSON*** 블록, ***일정***(지역명) 표시

#### B. 시스템 역할 메시지 (18개 규칙)
```java
messages.add(Map.of(
    "role", "system",
    "content",
    "너는 여행 전문가로서, 사용자의 여행 일정을 도와줘야해. 반드시 존댓말을 사용하고 예의바르면서 친근하게 답변해야해. 그리고 아래 사항은 무조건 반드시 지켜야해.\n" +
    "0. " + userName + "현재 날짜는 " + String.valueOf(LocalDateTime.now()) + " 이니까 명심하고, 이 날짜는 현재날짜이지 여행을 가거나 돌아오는 날짜가 아니야.\n" +
    "1. 만약, 사용자가 '시간여행' 같은 현실적이지 않은 질문을 한다면 일정을 추천해주지 말고 유쾌하게 답변해.\n" +
    // ... (총 18개 시스템 규칙)
));
```

**주요 시스템 규칙:**
- **현실성 검증**: 과거 날짜, 비현실적 요청 처리
- **정보 보완**: 부족한 정보에 대한 추천 및 가정
- **테마 지원**: 미식, 호캉스, 빵지순례 등 테마별 맞춤
- **다국어 지원**: 사용자 언어에 맞춘 응답
- **개인화**: 사용자 이름 기반 친근한 대화

### 3. 설정 및 의존성 관리
```java
@Value("${openai.api.key}")
private String apiKey;

@Value("${openai.api.url}")
private String apiUrl;

@Value("${openai.api.model}")
private String apiModel;
```

**상세 설명:**
- **설정 주입**: application.properties에서 API 키, URL, 모델명 주입
- **모델**: GPT-4o (최신 OpenAI 모델)
- **API 엔드포인트**: OpenAI Chat Completions API

## AI 응답 처리 흐름

### 1. 메시지 구성 단계
1. **선행 조건 추가**: 23개 필수 규칙을 첫 번째 메시지로 추가
2. **시스템 메시지**: AI 역할과 행동 규칙 정의
3. **대화 내역**: 이전 대화 내용을 컨텍스트로 활용
4. **최종 요청**: 선행 조건 준수 요청

### 2. API 호출 단계
1. **요청 구성**: 모델명, 메시지 리스트, 헤더 설정
2. **HTTP 호출**: RestTemplate을 통한 POST 요청
3. **응답 파싱**: choices 배열에서 첫 번째 응답 추출
4. **오류 처리**: 사용량 초과, 네트워크 오류 등 처리

### 3. 응답 후처리 단계
- **ChatController에서 처리**:
  - ***일정***(지역명) 문구 제거
  - ***JSON*** 블록 추출 및 파싱
  - 장소별 이미지 URL 추가
  - 채팅용 텍스트와 지도용 데이터 분리

## 예외 처리 및 안전성
- **사용량 초과**: `HttpClientErrorException.TooManyRequests` 처리
- **네트워크 오류**: 일반 Exception 처리
- **응답 누락**: choices 배열이 비어있는 경우 처리
- **사용자 친화적 메시지**: 기술적 오류를 사용자가 이해하기 쉬운 메시지로 변환

## 성능 최적화
- **컨텍스트 관리**: 이전 대화 내역을 효율적으로 활용
- **규칙 우선순위**: 선행 조건과 시스템 메시지의 명확한 구분
- **응답 크기 제한**: 적절한 응답 길이로 API 비용 최적화

## 사용 시나리오
1. **일정 생성**: 여행지, 날짜, 테마 기반 맞춤 일정 생성
2. **정보 보완**: 부족한 정보에 대한 AI 추천
3. **테마 여행**: 미식, 호캉스 등 특정 테마에 맞는 일정 구성
4. **동선 최적화**: 효율적인 여행 경로 제안

---
- **연관 클래스**: `ChatController` (응답 후처리), `PlaceService` (장소 이미지)
- **주요 역할**: AI 응답 생성, 프롬프트 엔지니어링, 일정 데이터 생성
- **외부 의존성**: OpenAI GPT-4 API, RestTemplate 