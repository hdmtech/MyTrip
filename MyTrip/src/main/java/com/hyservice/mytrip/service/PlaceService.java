package com.hyservice.mytrip.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class PlaceService {
    @Value("${google.places.api.key}")
    private String placesApiKey;

    @Value("${google.places.api.url}")
    private String placesApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

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
} 