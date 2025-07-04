# PlaceService

- **위치**: `src/main/java/com/hyservice/mytrip/service/PlaceService.java`
- **역할**: 여행지(장소) 정보 관리 및 검색, 지도 관련 기능 제공
- **의존성**: Google Places API, RestTemplate

## 주요 기능 및 핵심 코드

### 1. 장소 대표 이미지(사진) URL 조회 (getPlacePhotoUrl)
```java
public String getPlacePhotoUrl(Double lat, Double lon, String address, String name) {
    try {
        // 1. textsearch로 Place ID 찾기 (장소명, 주소를 ", "로 붙여서 검색)
        String query = name;
        if (address != null && !address.isEmpty()) {
            query += ", " + address;
        }
        String textSearchUrl = UriComponentsBuilder.fromHttpUrl(placesApiUrl + "/textsearch/json")
                .queryParam("query", query)
                .queryParam("key", placesApiKey)
                .build().toUriString();
        Map textSearchResult = restTemplate.getForObject(textSearchUrl, Map.class);
        if (textSearchResult != null && textSearchResult.get("results") instanceof List) {
            List results = (List) textSearchResult.get("results");
            if (!results.isEmpty()) {
                Map first = (Map) results.get(0);
                String placeId = (String) first.get("place_id");
                if (placeId != null) {
                    // 2. Place Details API로 대표사진 가져오기
                    String detailsUrl = UriComponentsBuilder.fromHttpUrl(placesApiUrl + "/details/json")
                            .queryParam("place_id", placeId)
                            .queryParam("fields", "photos")
                            .queryParam("key", placesApiKey)
                            .build().toUriString();
                    Map detailsResult = restTemplate.getForObject(detailsUrl, Map.class);
                    if (detailsResult != null && detailsResult.get("result") instanceof Map) {
                        Map resultObj = (Map) detailsResult.get("result");
                        if (resultObj.get("photos") instanceof List) {
                            List photos = (List) resultObj.get("photos");
                            if (!photos.isEmpty()) {
                                Map photo = (Map) photos.get(0);
                                String photoRef = (String) photo.get("photo_reference");
                                if (photoRef != null) {
                                    // 대표사진 URL 생성
                                    return placesApiUrl + "/photo?maxwidth=400&photoreference=" + photoRef + "&key=" + placesApiKey;
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (Exception e) {
        // 예외 발생 시 null 반환(디폴트 이미지 사용)
        return null;
    }
    // 실패시 null (디폴트 이미지 사용)
    return null;
}
```

**상세 설명:**
- **목적**: AI가 추천한 장소의 대표 이미지를 Google Places API를 통해 가져옴
- **입력 파라미터**:
  - `lat, lon`: 장소의 위도/경도 좌표
  - `address`: 장소 주소
  - `name`: 장소명
- **처리 과정**:
  1. **Text Search API**: 장소명 + 주소로 검색하여 Place ID 획득
  2. **Place Details API**: Place ID로 상세 정보 조회 (photos 필드만 요청)
  3. **Photo URL 생성**: 첫 번째 사진의 photo_reference로 이미지 URL 생성
- **반환값**: 
  - 성공 시: Google Places Photo API URL (maxwidth=400으로 최적화)
  - 실패 시: null (프론트엔드에서 디폴트 이미지 사용)

### 2. Google Places API 연동 구조
```java
@Value("${google.places.api.key}")
private String placesApiKey;

@Value("${google.places.api.url}")
private String placesApiUrl;

private final RestTemplate restTemplate = new RestTemplate();
```
**상세 설명:**
- **설정 주입**: application.properties에서 API 키와 URL을 주입받음
- **RestTemplate**: HTTP 요청을 위한 Spring의 HTTP 클라이언트
- **API 엔드포인트**:
  - Text Search: `/textsearch/json`
  - Place Details: `/details/json`
  - Photo: `/photo`

## API 호출 흐름
1. **Text Search API 호출**
   ```
   GET /textsearch/json?query={장소명, 주소}&key={API_KEY}
   ```
   - 장소명과 주소를 ", "로 연결하여 검색
   - 결과에서 첫 번째 장소의 place_id 추출

2. **Place Details API 호출**
   ```
   GET /details/json?place_id={PLACE_ID}&fields=photos&key={API_KEY}
   ```
   - place_id로 상세 정보 조회 (photos 필드만 요청하여 효율성 증대)
   - 결과에서 첫 번째 사진의 photo_reference 추출

3. **Photo URL 생성**
   ```
   {placesApiUrl}/photo?maxwidth=400&photoreference={PHOTO_REF}&key={API_KEY}
   ```
   - maxwidth=400으로 이미지 크기 최적화
   - 프론트엔드에서 바로 사용 가능한 URL 반환

## 예외 처리 및 안전성
- **try-catch 블록**: API 호출 실패 시 null 반환
- **null 체크**: 각 단계별로 null 체크를 통한 안전한 처리
- **디폴트 이미지**: 실패 시 프론트엔드에서 기본 이미지 표시
- **API 제한**: Google Places API의 요청 제한을 고려한 효율적인 호출

## 성능 최적화
- **필드 제한**: Place Details API에서 photos 필드만 요청
- **이미지 크기**: maxwidth=400으로 적절한 크기로 최적화
- **캐싱**: 프론트엔드에서 이미지 캐싱 활용

## 사용 시나리오
1. **AI 일정 생성**: AI가 장소를 추천할 때마다 해당 장소의 이미지 URL 생성
2. **지도 마커**: 마커 클릭 시 인포윈도우에 장소 이미지 표시
3. **일정 표시**: 생성된 일정의 각 장소별 대표 이미지 제공

---
- **연관 클래스**: `ChatController` (AI 응답 후처리), `OpenAIService` (일정 생성)
- **주요 역할**: 지도 마커 이미지, 장소 검색, Google Places API 연동
- **외부 의존성**: Google Places API, RestTemplate 