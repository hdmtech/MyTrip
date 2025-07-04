function addMessage(msg, sender, timeStr, dateStr) {
    var chatBox = document.getElementById('chat-box');
    
    // 이전 메시지와 날짜가 다르면 구분선 추가
    const lastMsg = chatBox.lastElementChild;
    if (lastMsg && dateStr) {
      const lastDate = lastMsg.getAttribute('data-date');
      if (lastDate && lastDate !== dateStr) {
        const divider = createDateDivider(dateStr);
        chatBox.appendChild(divider);
      }
    }
    
    var msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg ' + (sender === 'user' ? 'user' : 'ai');
    if (dateStr) msgDiv.setAttribute('data-date', dateStr);
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerText = msg;
    msgDiv.appendChild(bubble);
    // 시간 표시
    if (timeStr) {
        var timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.innerText = timeStr;
        msgDiv.appendChild(timeSpan);
    }
    chatBox.appendChild(msgDiv);
    
    // 자동 스크롤 시에는 플로팅 표시하지 않도록 플래그 설정
    isAutoScroll = true;
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // 자동 스크롤 완료 후 플래그 해제
    setTimeout(() => {
        isAutoScroll = false;
    }, 100);
}

function getChatHistory() {
    const chatBox = document.getElementById('chat-box');
    const msgs = [];
    
    // AI 기본 멘트를 자동으로 첫 번째 메시지로 추가
    const welcomeMessage = window.userName && window.userName !== 'guest' 
        ? `${window.userName}님 만나서 반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`
        : `반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`;
    msgs.push({ role: 'assistant', content: welcomeMessage });
    
    // 화면에 표시된 메시지들만 추가
    chatBox.querySelectorAll('.chat-msg').forEach(div => {
        const role = div.classList.contains('user') ? 'user' : 'assistant';
        const content = div.querySelector('.msg-bubble').innerText;
        msgs.push({ role, content });
    });
    return msgs;
}

function extractLocationFromReply(reply) {
    // [***일정***(여행지)] 또는 ***일정***(여행지) 형태에서 괄호 안의 내용 추출
    const match = reply.match(/^\[?.*?\*+일정\*+\(([^\)]+)\)\]?/);
    return match ? match[1] : null;
}

function removeScheduleBlock(aiText) {
    // [***일정***(여행지)] 또는 ***일정***(여행지) ```json ... ``` 패턴을 모두 제거
    return aiText.replace(/\[?.*?\*+일정\*+\([^\)]*\)\]?[\s\S]*?```[\s\S]*?```/g, '').trim();
}

function extractScheduleJson(aiText) {
    const match = aiText.match(/\*\*\*JSON\*\*\*([\s\S]*?)\*\*\*JSON\*\*\*/);
    if (match) {
        try {
            const json = JSON.parse(match[1].trim());
            console.log('일정 JSON 추출 성공:', json);
            return json;
        } catch (e) {
            console.warn('일정 JSON 파싱 오류:', e, match[1]);
            return null;
        }
    }
    console.warn('일정 JSON 블록을 찾지 못함');
    return null;
}

async function geocodeWithDelay(places, delay = 1200) {
    const results = [];
    for (const place of places) {
        if (place.xy && Array.isArray(place.xy) && place.xy.length === 2) {
            // xy값이 있으면 바로 사용 ([경도, 위도] 순서)
            results.push({ ...place, lat: place.xy[1], lon: place.xy[0] });
        } else {
            try {
                // 장소명+주소 → 주소만 → 장소명만 순서로 검색
                // (geocodeWithRetry 함수가 이미 있다면 사용, 없다면 기존 fetch 방식 사용)
                let query = `${place.name} ${place.address}`;
                let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                let data = await res.json();
                if (data && data.length > 0) {
                    results.push({ ...place, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
                } else {
                    res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.address)}`);
                    data = await res.json();
                    if (data && data.length > 0) {
                        results.push({ ...place, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
                    } else {
                        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.name)}`);
                        data = await res.json();
                        if (data && data.length > 0) {
                            results.push({ ...place, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
                        } else {
                            results.push(null);
                        }
                    }
                }
            } catch (e) {
                results.push(null);
            }
            await new Promise(r => setTimeout(r, delay));
        }
    }
    return results;
}

let map = null;
let googleMarkers = [];
let googlePolylines = [];
let dayMapObjects = {}; // 일차별 마커/폴리라인 관리 (통합)
let dayPolylineMap = {}; // { '1일차': [polyline, ...], ... }
let currentInfoWindow = null; // 현재 열린 인포윈도우
let currentRoomId = null;
let welcomeMessageTime = null; // 기본멘트 표시 시간 기록

function clearGoogleMap() {
    if (googleMarkers) {
        googleMarkers.forEach(m => m.setMap(null));
        googleMarkers = [];
    }
    if (googlePolylines) {
        googlePolylines.forEach(p => p.setMap(null));
        googlePolylines = [];
    }
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
}

function offsetLatLng(lat, lon, index, total, radius = 0.001, angleOffset = 0) {
    if (total === 1) return { lat, lng: lon };
    let angle;
    if (total === 2) {
        angle = index === 0 ? Math.PI / 4 : (5 * Math.PI) / 4;
    } else {
        angle = (2 * Math.PI * index) / total + angleOffset;
    }
    const dLat = Math.sin(angle) * radius;
    const dLon = Math.cos(angle) * radius;
    return { lat: lat + dLat, lng: lon + dLon };
}

function groupNearbyPlaces(places, threshold = 0.00015) {
    const groups = [];
    places.forEach(place => {
        let found = false;
        for (const group of groups) {
            const ref = group[0];
            const dLat = Math.abs(place.lat - ref.lat);
            const dLon = Math.abs(place.lon - ref.lon);
            if (dLat < threshold && dLon < threshold) {
                group.push(place);
                found = true;
                break;
            }
        }
        if (!found) groups.push([place]);
    });
    return groups;
}

async function showScheduleOnMap(schedule) {
    const container = document.querySelector('.container');
    if (container && !container.classList.contains('show-map')) {
        container.classList.add('show-map');
    }
    const mapArea = document.getElementById('map-area');
    container.classList.add('show-map');
    mapArea.style.display = 'block';

    // 지도 완전 초기화
    clearGoogleMap();
    if (!map) {
        map = new google.maps.Map(mapArea, {
            center: { lat: 37.5665, lng: 126.9780 }, // 서울 중심
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,   // 전체화면 버튼만 true
            rotateControl: false,
            scaleControl: false,
            zoomControl: false         // 확대/축소 버튼 숨김
        });
    }
    
    // === 일차별 마커/폴리라인 저장용 객체 초기화 ===
    dayMapObjects = {};

    const colors = ['#2563eb', '#e11d48', '#22c55e', '#f59e42', '#a21caf', '#0ea5e9', '#facc15', '#64748b'];
    let bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;
    let dayList = [];

    // 일차 키를 정렬된 순서로 가져옴
    const dayKeys = Object.keys(schedule).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.replace(/[^0-9]/g, ''));
        return numA - numB;
    });

    dayKeys.forEach((day, dayIdx) => {
        dayList.push(day);
        const color = colors[dayIdx % colors.length];
        const places = schedule[day];
        if (!Array.isArray(places) || places.length === 0) return;

        // order 기준 정렬
        const sortedPlaces = places
            .filter(place => place && place.name && place.address)
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        if (sortedPlaces.length === 0) return;

        // 유효한 좌표만 추출
        const validPlaces = [];
        for (const place of sortedPlaces) {
            if (place.xy && Array.isArray(place.xy) && place.xy.length === 2) {
                const lat = parseFloat(place.xy[1]);
                const lon = parseFloat(place.xy[0]);
                if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                    validPlaces.push({ ...place, lat, lon });
                }
            }
        }
        if (validPlaces.length === 0) return;

        // 같은 좌표끼리 그룹핑 (key: `${lat},${lon}`)
        const markerGroups = {};
        validPlaces.forEach(place => {
            const key = `${place.lat},${place.lon}`;
            if (!markerGroups[key]) markerGroups[key] = [];
            markerGroups[key].push(place);
        });

        // 마커 생성 (오프셋 없이 실제 좌표만 사용)
        const dayMarkers = [];
        Object.entries(markerGroups).forEach(([key, group]) => {
            const pos = { lat: group[0].lat, lng: group[0].lon };
            hasValidMarkers = true;
            let labelText = group.map(p => p.order).join(',');
            let markerScale = 2.5; // 항상 2.5
            let markerFontSize;
            
            // 숫자 개수에 따라 폰트 크기 조정 (viewBox 기준으로 조정)
            if (group.length === 1) {
                markerFontSize = 12; // 숫자 1개: 기본 크기
            } else if (group.length === 2) {
                markerFontSize = 6; // 숫자 2개: 약간 작게
            } else if (group.length === 3) {
                markerFontSize = 3; // 숫자 3개: 더 작게
            } else {
                markerFontSize = 1.5; // 숫자 4개 이상: 가장 작게
            }
            
            // SVG 마커 아이콘 동적 생성
            const svg = `
                <svg width=\"36\" height=\"48\" viewBox=\"0 0 24 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
                  <path d=\"M12 2C7.03 2 3 6.03 3 11c0 6.25 8.5 17 8.5 17S21 17.25 21 11c0-4.97-4.03-9-9-9z\" fill=\"${color}\" stroke=\"white\" stroke-width=\"2\"/>
                  <text x=\"12\" y=\"16\" text-anchor=\"middle\" font-size=\"${markerFontSize}\" font-family=\"Arial, sans-serif\" font-weight=\"bold\" fill=\"white\">${labelText}</text>
                </svg>
            `;
            const svgUrl = 'data:image/svg+xml;base64,' + btoa(svg.replace(/\n/g, '').replace(/\s+/g, ' '));
            const marker = new google.maps.Marker({
                position: pos,
                map: null, // 초기에는 숨김 상태
                icon: {
                    url: svgUrl,
                    scaledSize: new google.maps.Size(36 * markerScale / 2.2, 48 * markerScale / 2.2),
                    anchor: new google.maps.Point(18 * markerScale / 2.2, 44 * markerScale / 2.2),
                    zIndex: 100 + dayIdx * 100
                }
            });
            googleMarkers.push(marker);
            dayMarkers.push(marker);
            
            // 각 장소에 해당하는 마커 저장
            group.forEach(place => {
                place._marker = marker;
            });
            
            // InfoWindow 내용 생성 (photoUrl 기준 중복 제거)
            const uniqueGroup = [];
            const seenPhotoUrls = new Set();
            group.forEach(p => {
                const photoUrl = p.photoUrl || '/img/img/logo_main.png';
                if (!seenPhotoUrls.has(photoUrl)) {
                    uniqueGroup.push(p);
                    seenPhotoUrls.add(photoUrl);
                }
            });
            const info = uniqueGroup.map(p => {
                const photoUrl = p.photoUrl || '/img/img/logo_main.png';
                // 디폴트 이미지면 contain, 아니면 cover
                const objectFit = (photoUrl.includes('logo_main.png')) ? 'contain' : 'cover';
                const bgColor = (photoUrl.includes('logo_main.png')) ? '#f0f8ff' : '#f4f4f4';
                return `<div style=\"width:250px;max-width:250px;min-width:250px;max-height:150px;height:auto;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;\">
                    <img src=\"${photoUrl}\" alt=\"대표사진\" style=\"width:100%;height:90px;object-fit:${objectFit};border-radius:8px;background:${bgColor};overflow-y:hidden;display:block;margin:0;\">
                    <b style='display:block;overflow:hidden;overflow-x:hidden;overflow-y:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:100%;margin:0;'>${p.order}. ${p.type} - ${p.name}</b>
                    <div style=\"font-size:0.95em;color:#4a4a4a;overflow:hidden;overflow-x:hidden;overflow-y:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-overflow:ellipsis;white-space:normal;line-height:1.3;height:2.6em;max-height:2.6em;min-height:2.6em;margin:0;\">${p.address}</div>
                </div>`;
            }).join('<hr style=\'margin:4px 0\'>');
            const infowindow = new google.maps.InfoWindow({ content: info });
            marker._infoWindow = infowindow;
            marker.addListener('click', () => {
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                }
                infowindow.open(map, marker);
                currentInfoWindow = infowindow;
            });
            bounds.extend(pos);
        });

        // 폴리라인 생성 (오프셋 없이 실제 좌표만 사용)
        const dayPolylines = [];
        // order 순서대로 좌표 배열 생성
        const polyPoints = validPlaces.map(p => ({ lat: p.lat, lng: p.lon }));
        if (polyPoints.length > 1) {
            // 항상 전체 순서대로 연결
            const polyline = new google.maps.Polyline({
                path: polyPoints,
                strokeColor: color,
                strokeOpacity: 0.7,
                strokeWeight: 4,
                map: null // 초기에는 숨김 상태
            });
            googlePolylines.push(polyline);
            dayPolylines.push(polyline);
        }
        
        // dayMapObjects에 저장
        dayMapObjects[day] = {
            markers: dayMarkers,
            polylines: dayPolylines
        };
    });
    
    if (hasValidMarkers && !bounds.isEmpty()) {
        map.fitBounds(bounds);
    } else {
        map.setCenter({ lat: 37.5665, lng: 126.9780 });
        map.setZoom(10);
    }

    // === 일정 하단 영역 생성 및 표시 ===
    const scheduleArr = Object.keys(schedule)
        .sort((a, b) => {
            // 숫자만 추출해서 비교
            const numA = parseInt(a.replace(/[^0-9]/g, ''));
            const numB = parseInt(b.replace(/[^0-9]/g, ''));
            return numA - numB;
        })
        .map(day => ({ day, items: schedule[day] }));
    initializeMapAndSchedule(scheduleArr);
    removeFloatingPanels();

    // 채팅 스크롤을 맨 아래로 내림 (지도 처음 보여질 때)
    setTimeout(function() {
      var chatBox = document.getElementById('chat-box');
      if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }, 0);
}

function hideMap() {
    const container = document.querySelector('.container');
    const mapArea = document.getElementById('map-area');
    container.classList.remove('show-map');
    mapArea.style.display = 'none';
    clearGoogleMap();
}

async function moveMapToRegion(regionName) {
    const container = document.querySelector('.container');
    const mapArea = document.getElementById('map-area');
    container.classList.add('show-map');
    mapArea.style.display = 'block';

    // 지도 초기화
    clearGoogleMap();
    if (!map) {
        map = new google.maps.Map(mapArea, {
            center: { lat: 37.5665, lng: 126.9780 },
            zoom: 10
        });
    }

    // 지역명으로 좌표 검색
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(regionName)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            map.setCenter({ lat, lng: lon });
            map.setZoom(12);
        } else {
            // 검색 결과가 없으면 기본 위치
            map.setCenter({ lat: 37.5665, lng: 126.9780 });
            map.setZoom(10);
        }
    } catch (error) {
        // 에러 발생 시 기본 위치
        map.setCenter({ lat: 37.5665, lng: 126.9780 });
        map.setZoom(10);
    }
}

function showChatLoading() {
  const chatCard = document.querySelector('.chat-card');
  if (!chatCard) return;
  if (chatCard.querySelector('.chat-loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'chat-loading-overlay';
  overlay.innerHTML = `<div class="loading-circle"><img src="/img/gif/loading.gif" alt="로딩중"><div class="loading-text">MyTrip</div></div>`;
  chatCard.appendChild(overlay);
}

function hideChatLoading() {
  const chatCard = document.querySelector('.chat-card');
  if (!chatCard) return;
  const overlay = chatCard.querySelector('.chat-loading-overlay');
  if (overlay) overlay.remove();
}

function hideAllMapAndSchedule() {
    // show-map 클래스 제거
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.classList.remove('show-map');
    // 지도 영역 숨김
    const mapArea = document.getElementById('map-area');
    if (mapArea) mapArea.style.display = 'none';
    // 일정 영역 제거
    const container = document.getElementById('schedule-container');
    if (container) container.remove();
}

function resetMapAndScheduleUI(force) {
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.classList.remove('show-map');
    const mapArea = document.getElementById('map-area');
    if (mapArea) mapArea.style.display = 'none';
    const container = document.getElementById('schedule-container');
    if (container) container.remove();
    if (typeof clearGoogleMap === 'function') clearGoogleMap();
    if (typeof dayMapObjects !== 'undefined') dayMapObjects = {};
    if (force) {
        [0, 100, 200].forEach(delay => {
            setTimeout(() => {
                const mainContainer2 = document.querySelector('.container');
                if (mainContainer2) mainContainer2.classList.remove('show-map');
                const mapArea2 = document.getElementById('map-area');
                if (mapArea2) mapArea2.style.display = 'none';
                const container2 = document.getElementById('schedule-container');
                if (container2) container2.remove();
            }, delay);
        });
    }
}

function loadChatRoomsAndAutoSelect() {
    fetch('/chat/rooms')
        .then(res => res.json())
        .then(list => {
            const ul = document.getElementById('chatRoomList');
            ul.innerHTML = '';
            if (list.length === 0) {
                resetMapAndScheduleUI(true);
                createNewChatRoom();
                return;
            }
            list.forEach(room => {
                const li = document.createElement('li');
                li.className = 'chat-room-item';
                li.setAttribute('data-room-id', String(room.room_id));
                li.setAttribute('data-content', room.title);
                li.onclick = () => selectChatRoom(String(room.room_id));
                
                // 채팅방 제목과 날짜를 포함한 컨텐츠 생성
                const contentDiv = document.createElement('div');
                contentDiv.className = 'chat-room-content';
                
                const titleSpan = document.createElement('span');
                titleSpan.className = 'chat-room-title-text';
                titleSpan.textContent = room.title;
                contentDiv.appendChild(titleSpan);
                
                // 날짜 표시 (dayjs 활용, 생성일 기준, 24~48시간 이내 어제+상세)
                if (room.created_at) {
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'chat-room-date';
                    // dayjs 초기화 및 플러그인/로케일 적용
                    dayjs.extend(window.dayjs_plugin_relativeTime);
                    dayjs.locale('ko');

                    const fullDate = dayjs(room.created_at);
                    const nowFull = dayjs();
                    const date = fullDate.startOf('day');
                    const now = nowFull.startOf('day');

                    const fullDateStr = fullDate.format('YYYY년 M월 D일');

                    const diffDays = now.diff(date, 'day');
                    const diffMonths = now.diff(date, 'month');
                    const diffYears = now.diff(date, 'year');
                    const diffMinutes = nowFull.diff(fullDate, 'minute');
                    const diffHours = nowFull.diff(fullDate, 'hour');

                    let label = '';
                    if (diffMinutes < 1440) { // 24시간 이내
                        if (diffDays === 0) {
                            if (diffHours === 0) {
                                label = `오늘 (${diffMinutes}분 전)\n${fullDateStr}`;
                            } else {
                                label = `오늘 (${diffHours}시간 전)\n${fullDateStr}`;
                            }
                        } else if (diffDays === 1) {
                            if (diffHours === 0) {
                                label = `어제 (${diffMinutes}분 전)\n${fullDateStr}`;
                            } else {
                                label = `어제 (${diffHours}시간 전)\n${fullDateStr}`;
                            }
                        } else {
                            label = `${diffDays}일 전\n${fullDateStr}`;
                        }
                    } else if (diffDays === 1) {
                        if (diffMinutes < 2880) { // 48시간 이내
                            if (diffHours === 0) {
                                label = `어제 (${diffMinutes}분 전)\n${fullDateStr}`;
                            } else {
                                label = `어제 (${diffHours}시간 전)\n${fullDateStr}`;
                            }
                        } else {
                            label = `2일 전\n${fullDateStr}`;
                        }
                    } else if (diffDays < 30) {
                        label = `${diffDays}일 전\n${fullDateStr}`;
                    } else if (diffMonths < 12) {
                        label = `${diffMonths}개월 전\n${fullDateStr}`;
                    } else {
                        const years = diffYears;
                        const months = diffMonths - years * 12;
                        if (months === 0) {
                            label = `${years}년 전\n${fullDateStr}`;
                        } else {
                            label = `${years}년 ${months}개월 전\n${fullDateStr}`;
                        }
                    }
                    dateSpan.textContent = label;
                    contentDiv.appendChild(dateSpan);
                }
                
                li.appendChild(contentDiv);
                
                // 삭제 버튼: 임시채팅방이 아니면 항상 보이게
                if (!String(room.room_id).startsWith('temp_')) {
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '삭제';
                    delBtn.className = 'chat-room-del-btn';
                    delBtn.onclick = (e) => { e.stopPropagation(); deleteChatRoom(String(room.room_id)); };
                    li.appendChild(delBtn);
                }
                ul.appendChild(li);
            });
            // 가장 최근 채팅방 자동 선택
            if (list.length > 0) {
                selectChatRoom(String(list[0].room_id));
            } else {
                hideAllMapAndSchedule();
            }
        });
}

// 기본 "새 대화" 채팅방 생성 (사용하지 않음 - createNewChatRoom으로 대체)
/*
function createDefaultChatRoom() {
    resetMapAndScheduleUI(true);
    fetch('/chat/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 대화' })
    })
    .then(res => res.json())
    .then(data => {
        currentRoomId = data.room_id;
        document.getElementById('chat-box').innerHTML = '';
        // 기본멘트 표시 및 시간 기록
        const welcomeMessage = window.userName && window.userName !== 'guest' 
            ? `${window.userName}님 만나서 반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`
            : `반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`;
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const dateStr = now.getFullYear().toString() + (now.getMonth()+1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');
        addMessage(welcomeMessage, 'ai', formatTimeTo12Hour(timeStr), dateStr);
        welcomeMessageTime = { date: dateStr, time: timeStr, message: welcomeMessage };
        loadChatRoomsAndAutoSelect();
    });
}
*/

// 새 대화 버튼 클릭 시 임시 채팅방 생성
function createNewChatRoom() {
    // 새 대화 시작 시 지도+일정 영역 숨기기
    hideMap();
    removeScheduleContainer();
    // 스크롤 상태 초기화
    hasUserScrolled = false;
    // 이미 임시 채팅방이 있는지 확인
    const existingTempRoom = document.querySelector('.chat-room-item[data-room-id^="temp_"]');
    if (existingTempRoom) {
        // 기존 임시 채팅방이 있으면 해당 방을 선택
        selectChatRoom(existingTempRoom.getAttribute('data-room-id'));
        return;
    }
    // 현재 채팅창 초기화
    document.getElementById('chat-box').innerHTML = '';
    currentRoomId = null;
    // 임시 채팅방 생성 (DB 저장 안함)
    const tempRoomId = 'temp_' + Date.now();
    currentRoomId = tempRoomId;
    // 채팅방 목록에 임시 항목 추가 (기존 목록 유지)
    const ul = document.getElementById('chatRoomList');
    const li = document.createElement('li');
    li.className = 'chat-room-item active';
    li.setAttribute('data-room-id', tempRoomId);
    li.setAttribute('data-content', '대화를 시작해 보세요!');
    li.onclick = () => selectChatRoom(tempRoomId);
    
    // 채팅방 제목과 날짜를 포함한 컨텐츠 생성
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-room-content';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'chat-room-title-text';
    titleSpan.textContent = '새로운 대화를 시작해 보세요!';
    contentDiv.appendChild(titleSpan);
    
    // 임시 채팅방의 날짜 표시 (현재 시간)
    const dateSpan = document.createElement('span');
    dateSpan.className = 'chat-room-date';
    dateSpan.textContent = '오늘';
    contentDiv.appendChild(dateSpan);
    
    li.appendChild(contentDiv);

    // 삭제 버튼 (임시 방이므로 실제 삭제는 안함)
    /*
    const isOnlyTempRoom = ul.querySelectorAll('.chat-room-item').length === 0;
    if (!isOnlyTempRoom) {
        const delBtn = document.createElement('button');
        delBtn.textContent = '삭제';
        delBtn.className = 'chat-room-del-btn';
        delBtn.onclick = (e) => { 
            e.stopPropagation(); 
            // 임시 방이므로 목록에서만 제거
            li.remove();
            document.getElementById('chat-box').innerHTML = '';
            currentRoomId = null;
            // 임시 채팅방 삭제 후 가장 최근 채팅방 자동 선택
            const remainingRooms = document.querySelectorAll('.chat-room-item:not([data-room-id^="temp_"])');
            if (remainingRooms.length > 0) {
                // 가장 최근 채팅방 (첫 번째 항목) 선택
                const mostRecentRoom = remainingRooms[0];
                const roomId = mostRecentRoom.getAttribute('data-room-id');
                selectChatRoom(roomId);
            } else {
                // 채팅방이 없으면 기본 채팅방 생성
                createDefaultChatRoom();
            }
        };
        li.appendChild(delBtn);
    }
    */

    // 기존 항목들의 active 클래스 제거하고 새 항목을 맨 위에 추가
    document.querySelectorAll('.chat-room-item').forEach(item => item.classList.remove('active'));
    ul.insertBefore(li, ul.firstChild);
    // AI 기본 멘트 표시 (임시 채팅방에서는 DB 저장 안함)
    const welcomeMessage = window.userName && window.userName !== 'guest' 
        ? `${window.userName}님 만나서 반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`
        : `반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`;
    // 현재 시간으로 AI 기본 멘트에 시간 표시
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    addMessage(welcomeMessage, 'ai', formatTimeTo12Hour(timeStr));
    // === 기본멘트 시간 기록 ===
    const dateStr = now.getFullYear().toString() + (now.getMonth()+1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');
    welcomeMessageTime = { date: dateStr, time: timeStr, message: welcomeMessage };
    // 사이드바 닫기
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }
}

// 시간 포맷 변환 함수
function formatTimeTo12Hour(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':');
    let hour = parseInt(h, 10);
    const min = m;
    const isAM = hour < 12;
    let period = isAM ? '오전' : '오후';
    if (hour === 0) hour = 12;
    if (hour > 12) hour -= 12;
    return `${period} ${hour.toString().padStart(2, '0')}:${min}`;
}

// 메시지 전송 버튼 클릭 시
const sendBtn = document.getElementById('send-btn');
sendBtn.onclick = async function() {
    const input = document.getElementById('input-box');
    const msg = input.value.trim();
    if (!msg) return;
    // 현재 시간
    const now = new Date();
    const dateStr = now.getFullYear().toString() + (now.getMonth()+1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    addMessage(msg, 'user', formatTimeTo12Hour(timeStr), dateStr);
    input.value = '';

    let usedRoomId = currentRoomId;
    // 게스트가 아닐 때만 DB 저장 처리
    if (window.userName && window.userName !== 'guest') {
        // 임시 채팅방이면 정식 채팅방 생성 및 전환
        if (currentRoomId && String(currentRoomId).startsWith('temp_')) {
            // 1. 정식 채팅방 생성 (제목: 사용자 메시지)
            const createRes = await fetch('/chat/room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: msg })
            });
            const createData = await createRes.json();
            const newRoomId = createData.room_id;
            if (!newRoomId) return;
            usedRoomId = newRoomId;
            // 2. 기본멘트 저장
            if (welcomeMessageTime) {
                await fetch(`/chat/logs/${newRoomId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'assistant',
                        message: welcomeMessageTime.message,
                        date: welcomeMessageTime.date,
                        time: welcomeMessageTime.time
                    })
                });
                welcomeMessageTime = null;
            }
            // 3. 사용자 메시지 저장
            await fetch(`/chat/logs/${newRoomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'user',
                    message: msg,
                    date: dateStr,
                    time: timeStr
                })
            });
            // 4. currentRoomId/UI 갱신 및 목록 새로고침
            currentRoomId = newRoomId;
            loadChatRoomsAndAutoSelect();
            // selectChatRoom(currentRoomId); // AI 응답 후에 갱신
        } else {
            // 새 대화방에서 첫 메시지 전송 시 기본멘트도 함께 저장
            if (welcomeMessageTime && currentRoomId) {
                // 기본멘트 저장
                await fetch(`/chat/logs/${currentRoomId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'assistant',
                        message: welcomeMessageTime.message,
                        date: welcomeMessageTime.date,
                        time: welcomeMessageTime.time
                    })
                });
                welcomeMessageTime = null; // 한 번만 저장
            }
            // 사용자 메시지 저장
            await fetch(`/chat/logs/${currentRoomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'user',
                    message: msg,
                    date: dateStr,
                    time: timeStr
                })
            });
        }
    }

    // === AI 응답 요청 ===
    // 채팅 히스토리 준비
    const chatHistory = getChatHistory();
    const payload = {
        message: msg,
        chatHistory: chatHistory,
        roomId: (window.userName && window.userName !== 'guest') ? currentRoomId : null
    };
    showChatLoading();
    try {
        const res = await fetch('/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.replyForChat) {
            addMessage(data.replyForChat, 'ai');
            // 일정이 있으면 지도 표시
            if (data.schedule) {
                showScheduleOnMap(data.schedule);
            } else {
                // AI 응답에서 일정 추출 시도
                const scheduleJson = extractScheduleJson(data.replyForChat);
                if (scheduleJson) {
                    showScheduleOnMap(scheduleJson);
                }
            }
        } else if (data.reply) {
            addMessage(data.reply, 'ai');
            // 일정이 있으면 지도 표시
            if (data.schedule) {
                showScheduleOnMap(data.schedule);
            } else {
                // AI 응답에서 일정 추출 시도
                const scheduleJson = extractScheduleJson(data.reply);
                if (scheduleJson) {
                    showScheduleOnMap(scheduleJson);
                }
            }
        }
    } finally {
        hideChatLoading();
    }
    // AI 응답 후 채팅방 목록/내역 갱신 (게스트가 아닐 때만)
    if (window.userName && window.userName !== 'guest') {
        loadChatRoomsAndAutoSelect();
        selectChatRoom(currentRoomId);
    }
};

// 채팅방 선택 시 DB에서 불러온 메시지(기본멘트 포함)만 렌더링 (기본멘트 직접 추가 X)
function selectChatRoom(roomId) {
    resetMapAndScheduleUI(false);
    // 채팅방 선택 시 지도/일정 상태를 항상 먼저 초기화
    hideMap();
    removeScheduleContainer();
    // 스크롤 상태 초기화
    hasUserScrolled = false;
    // 임시 채팅방이 있고, 실제 채팅방을 선택하는 경우 임시 채팅방 제거
    if (!String(roomId).startsWith('temp_')) {
        const tempRoom = document.querySelector('.chat-room-item[data-room-id^="temp_"]');
        if (tempRoom) {
            tempRoom.remove();
        }
    }
    
    currentRoomId = roomId;
    // 목록 강조
    document.querySelectorAll('.chat-room-item').forEach(li => li.classList.remove('active'));
    const li = document.querySelector('.chat-room-item[data-room-id="' + roomId + '"]');
    if (li) li.classList.add('active');
    
    // 사이드바 닫기
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }
    
    // 임시 채팅방인 경우
    if (roomId && String(roomId).startsWith('temp_')) {
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML = '';
        
        // AI 기본 멘트를 상단에 표시
        const welcomeMessage = window.userName && window.userName !== 'guest' 
            ? `${window.userName}님 만나서 반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`
            : `반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`;
        
        // 현재 시간으로 AI 기본 멘트에 시간 표시
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        addMessage(welcomeMessage, 'ai', formatTimeTo12Hour(timeStr));
        return;
    }
    
    // 실제 채팅방인 경우 DB에서 내역 불러오기
    fetch('/chat/logs/' + roomId)
        .then(res => {
            if (!res.ok) {
                throw new Error('채팅 내역을 불러올 수 없습니다.');
            }
            return res.json();
        })
        .then(logs => {
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML = '';
            
            if (!logs.messages || !Array.isArray(logs.messages)) {
                addMessage('대화 내역을 불러올 수 없습니다.', 'ai');
                return;
            }
            
            // DB에서 불러온 메시지들 표시 (날짜 구분선 포함)
            let lastDate = null;
            logs.messages.forEach(msg => {
                let timeStr = '';
                if (msg.time) {
                  timeStr = formatTimeTo12Hour(msg.time);
                }
                // 날짜가 바뀌면 구분선 추가
                if (msg.date && msg.date !== lastDate) {
                  const divider = createDateDivider(msg.date);
                  chatBox.appendChild(divider);
                  lastDate = msg.date;
                }
                addMessage(msg.message, msg.role === 'user' ? 'user' : 'ai', timeStr, msg.date);
            });

            // === [개선] 가장 마지막부터 거슬러 올라가서 스케줄+지역이 있는 AI응답 기준으로 지도/일정 표시 ===
            let found = false;
            for (let i = logs.messages.length - 1; i >= 0; i--) {
                const msg = logs.messages[i];
                if (msg.role === 'assistant' && msg.schedule && msg.region) {
                    Object.values(msg.schedule).forEach(dayArr => {
                        if (Array.isArray(dayArr)) {
                            dayArr.forEach(place => {
                                if (!place.photoUrl && place.photo_url) place.photoUrl = place.photo_url;
                                if (!place.photoUrl) place.photoUrl = '/img/img/logo_main.png';
                            });
                        }
                    });
                    showScheduleOnMap(msg.schedule);
                    found = true;
                    break;
                }
            }
            // 메시지가 없거나, region/schedule이 모두 없는 경우에도 지도/일정 숨김
            if (!found || !logs.messages || logs.messages.length === 0) {
                hideMap();
                removeScheduleContainer();
            }
        })
        .catch(error => {
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML = '';
            addMessage('채팅 내역을 불러오는 중 오류가 발생했습니다.', 'ai');
        });
}

function deleteChatRoom(roomId) {
    showCustomConfirm('정말 삭제하시겠습니까?', function() {
        fetch('/chat/room/' + roomId, { method: 'DELETE' })
            .then(res => res.json())
            .then(() => {
                loadChatRoomsAndAutoSelect();
                // 삭제된 방이 현재 선택된 방이면 채팅창 비움
                if (currentRoomId === roomId) {
                    document.getElementById('chat-box').innerHTML = '';
                    currentRoomId = null;
                }
            });
    });
}

window.addEventListener('DOMContentLoaded', function() {
    var name = (window.userName && window.userName !== '') ? window.userName : '';
    var greet = name ? `${name}님 만나서 반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!` : `반갑습니다!\n저는 여행 일정을 도와주는 AI입니다!\n여행하고 싶은 지역과\n가는 날짜, 돌아오는 날짜를 알려주시면\n멋진 일정을 추천 해줄께요!`;
    
    // 현재 시간으로 AI 기본 멘트에 시간 표시
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    addMessage(greet, "ai", formatTimeTo12Hour(timeStr));

    // 햄버거 버튼 및 사이드바 동작
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', function() {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('open');
        });
        
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        });
    }

    // 설정 버튼 및 팝업 동작
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPopup = document.getElementById('settingsPopup');
    let popupOpen = false;

    settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (settingsPopup.style.display === 'block') {
            settingsPopup.style.display = 'none';
            popupOpen = false;
        } else {
            settingsPopup.style.display = 'block';
            popupOpen = true;
        }
    });
    // 팝업 바깥 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (popupOpen && !settingsPopup.contains(e.target) && e.target !== settingsBtn) {
            settingsPopup.style.display = 'none';
            popupOpen = false;
        }
    });


    // AI모델 변경 버튼
    document.getElementById('aiModelBtn').addEventListener('click', function() {
        showCustomConfirm('AI모델을 변경하시겠습니까?\n현재 설정: GPT-4o', function() {
            // AI모델 변경 로직 (추후 구현)
            showCustomAlert('AI모델 변경 기능은 준비 중입니다.');
        });
    });

    // 색상테마 변경 버튼
    document.getElementById('themeBtn').addEventListener('click', function() {
        showCustomConfirm('색상테마를 변경하시겠습니까?', function() {
            // 색상테마 변경 로직 (추후 구현)
            showCustomAlert('색상테마 변경 기능은 준비 중입니다.');
        });
    });



    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', function() {
        showCustomConfirm('채팅을 종료하시겠습니까?', function() {
            window.location.href = '/logout';
        });
    });


    if (window.userName && window.userName !== 'guest') {
        loadChatRoomsAndAutoSelect();
        document.getElementById('newChatRoomBtn').onclick = createNewChatRoom;
        
        // 뒤로가기 버튼 이벤트 리스너
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('open');
            });
        }
    }
    
    // 메시지 입력창 키보드 이벤트
    const inputBox = document.getElementById('input-box');
    if (inputBox) {
        inputBox.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 기본 동작 방지 (줄바꿈 방지)
                sendBtn.click(); // 전송 버튼 클릭
            }
        });
    }
    
    // 채팅창에 스크롤 이벤트 리스너 추가 (디바운싱 적용)
    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
        let scrollTimeout;
        chatBox.addEventListener('scroll', function() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(handleChatBoxScroll, 50); // 50ms 디바운싱
        });
    }
});

// === 일정 목록/탭 영역 생성 ===
function createScheduleContainer() {
  // 기존 schedule-container가 있으면 삭제(위치 보정)
  const old = document.getElementById('schedule-container');
  if (old) old.remove();
  const container = document.createElement('div');
  container.id = 'schedule-container';
  container.innerHTML = `
    <div id="schedule-tabs"></div>
    <div id="schedule-list-wrapper"><div id="schedule-list"></div></div>
  `;
  // #map이 있으면 그 아래, 없으면 #map-area 아래에 삽입
  const mapDiv = document.getElementById('map');
  if (mapDiv) {
    mapDiv.parentNode.insertBefore(container, mapDiv.nextSibling);
  } else {
    const mapArea = document.getElementById('map-area');
    if (mapArea) mapArea.parentNode.insertBefore(container, mapArea.nextSibling);
  }
  // 일정 카드 가로 스크롤 활성화
  enableHorizontalScroll('schedule-list-wrapper');
}

// 일차별 마커/폴리라인 관리 (통합)
const colors = ['#2563eb', '#e11d48', '#22c55e', '#f59e42', '#a21caf', '#0ea5e9', '#facc15', '#64748b'];

function renderScheduleTabs(schedules) {
  const tabs = document.getElementById('schedule-tabs');
  tabs.innerHTML = '';
  if (!schedules || schedules.length === 0) {
    tabs.style.display = 'flex';
    return;
  }
  tabs.style.display = 'flex';
  schedules.forEach((daySchedule, idx) => {
    const btn = document.createElement('button');
    btn.className = 'schedule-tab-btn' + (idx === 0 ? ' active' : '');
    btn.innerText = `${idx + 1}일차`;
    btn.dataset.day = daySchedule.day;
    // 동적으로 색상 적용
    const color = colors[idx % colors.length];
    btn.style.borderColor = color;
    if (btn.classList.contains('active')) {
      btn.style.background = color;
      btn.style.color = '#fff';
    } else {
      btn.style.background = '#fff';
      btn.style.color = color;
    }
    btn.onclick = function() {
      // 모든 탭 비활성화
      document.querySelectorAll('.schedule-tab-btn').forEach((b, i) => {
        b.classList.remove('active');
        b.style.background = '#fff';
        b.style.color = colors[i % colors.length];
      });
      
      // 기존에 열려 있던 인포윈도우 닫기
      if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
      }
      // 모든 일차 숨기기
      schedules.forEach(ds => hideDayOnMap(ds.day));
      
      // 선택된 탭 활성화
      btn.classList.add('active');
      btn.style.background = color;
      btn.style.color = '#fff';
      
      // 선택된 일차 표시
      showDayOnMap(daySchedule.day);
      renderScheduleList(schedules, daySchedule.day, idx);
      
      // 카드 가로 스크롤 왼쪽으로 이동
      const wrapper = document.getElementById('schedule-list-wrapper');
      if (wrapper) wrapper.scrollLeft = 0;
    };
    tabs.appendChild(btn);
  });
}

function renderScheduleList(schedules, activeDay, activeIdx) {
  const list = document.getElementById('schedule-list');
  list.innerHTML = '';
  const dayObj = schedules.find(s => s.day == activeDay) || schedules[0];
  const idx = schedules.findIndex(s => s.day == activeDay);
  const color = colors[idx >= 0 ? idx : (activeIdx || 0) % colors.length];
  
  dayObj.items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.style.borderColor = color;
    
    // 좌표 계산
    let lat = item.lat;
    let lng = item.lon;
    if ((!lat || !lng) && item.xy && item.xy.length === 2) {
      lat = parseFloat(item.xy[1]);
      lng = parseFloat(item.xy[0]);
    }
    
    const isDefault = !item.photoUrl || item.photoUrl.includes('logo_main.png');
    const objectFit = isDefault ? 'contain' : 'cover';
    const imageClass = isDefault ? 'default-image' : '';
    
    card.innerHTML = `
      <div class="schedule-image">
        <img src="${item.photoUrl || '/img/img/logo_main.png'}"
             alt="IMAGE"
             class="${imageClass}"
             style="width:100%;height:100%;object-fit:${objectFit};border-radius:10px;cursor:pointer;">
      </div>
      <div class="schedule-time">${item.time || ''}</div>
      <div class="schedule-title" style="color: ${color};">${i + 1}. ${item.title || item.name || ''}</div>
      <div class="schedule-address">${item.address || ''}</div>
    `;
    
    // 이미지 클릭 시 해당 마커로 지도 중심 이동 및 인포윈도우 오픈
    const img = card.querySelector('img');
    if (img && lat && lng && !isNaN(lat) && !isNaN(lng)) {
      img.addEventListener('click', function() {
        // 저장된 마커가 있으면 직접 사용, 없으면 가장 가까운 마커 찾기
        let targetMarker = item._marker;
        
        if (!targetMarker) {
          // 해당 일차의 마커들 중에서 가장 가까운 마커 찾기
          let closestMarker = null;
          let minDistance = Infinity;
          
          if (dayMapObjects[activeDay] && dayMapObjects[activeDay].markers) {
            dayMapObjects[activeDay].markers.forEach(marker => {
              if (marker && marker.getPosition) {
                const markerPos = marker.getPosition();
                const distance = Math.sqrt(
                  Math.pow(markerPos.lat() - lat, 2) + 
                  Math.pow(markerPos.lng() - lng, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestMarker = marker;
                }
              }
            });
          }
          targetMarker = closestMarker;
        }
        
        // 지도 이동
        if (targetMarker && map) {
          map.panTo(targetMarker.getPosition());
          map.setZoom(16); // 적당한 줌 레벨로 설정
          // 인포윈도우 오픈
          if (currentInfoWindow) {
            currentInfoWindow.close();
          }
          if (targetMarker._infoWindow) {
            targetMarker._infoWindow.open(map, targetMarker);
            currentInfoWindow = targetMarker._infoWindow;
          }
        } else if (map) {
          // 마커를 찾지 못한 경우 좌표로 직접 이동
          map.panTo({ lat: lat, lng: lng });
          map.setZoom(16);
        }
      });
    }
    
    list.appendChild(card);
  });
}

function showDayOnMap(day) {
  if (dayMapObjects[day]) {
    // 마커들 표시
    if (dayMapObjects[day].markers) {
      dayMapObjects[day].markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(map);
        }
      });
    }
    // 폴리라인들 표시
    if (dayMapObjects[day].polylines) {
      dayMapObjects[day].polylines.forEach(polyline => {
        if (polyline && polyline.setMap) {
          polyline.setMap(map);
        }
      });
    }
  }
}

function hideDayOnMap(day) {
  if (dayMapObjects[day]) {
    // 마커들 숨기기
    if (dayMapObjects[day].markers) {
      dayMapObjects[day].markers.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    }
    // 폴리라인들 숨기기
    if (dayMapObjects[day].polylines) {
      dayMapObjects[day].polylines.forEach(polyline => {
        if (polyline && polyline.setMap) {
          polyline.setMap(null);
        }
      });
    }
  }
}

// 지도/일정 초기화 함수에서 호출
function initializeMapAndSchedule(schedules) {
  createScheduleContainer();
  renderScheduleTabs(schedules);
  
  // 모든 일차 숨기기
  schedules.forEach(daySchedule => {
    hideDayOnMap(daySchedule.day);
  });
  
  // 1일차만 기본 표시
  if (schedules.length > 0) {
    showDayOnMap(schedules[0].day);
    renderScheduleList(schedules, schedules[0].day, 0);
  }
}

// 불필요한 day-toggle-panel 등 패널 DOM이 있으면 항상 제거
function removeFloatingPanels() {
  const panel = document.getElementById('day-toggle-panel');
  if (panel) panel.remove();
}

function enableHorizontalScroll(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    // 마우스 휠로 가로 스크롤
    wrapper.addEventListener('wheel', function(e) {
        if (e.deltaY !== 0) {
            e.preventDefault();
            wrapper.scrollLeft += e.deltaY;
        }
    }, { passive: false });
    // 마우스 드래그로 가로 스크롤
    let isDown = false;
    let startX, scrollLeft;
    wrapper.addEventListener('mousedown', function(e) {
        isDown = true;
        wrapper.classList.add('dragging');
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
    });
    wrapper.addEventListener('mouseleave', function() {
        isDown = false;
        wrapper.classList.remove('dragging');
    });
    wrapper.addEventListener('mouseup', function() {
        isDown = false;
        wrapper.classList.remove('dragging');
    });
    wrapper.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX) * 1.5;
        wrapper.scrollLeft = scrollLeft - walk;
    });
}

// === 채팅 날짜 구분선 및 플로팅 표시 ===
let chatDateFloatTimer = null;
let chatDateFloatDiv = null;
let chatScrollTimer = null;
let isScrolling = false;
let hasUserScrolled = false; // 사용자가 스크롤했는지 추적
let isAutoScroll = false; // 자동 스크롤인지 추적

function formatDateToKorean(dateStr) {
  if (!dateStr || dateStr.length !== 8) return '';
  const year = dateStr.substring(0, 4);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);
  const dateObj = new Date(year, month - 1, day);
  const week = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${year}년 ${month}월 ${day}일 ${week[dateObj.getDay()]}`;
}

function showChatDateFloat(dateStr) {
  if (!dateStr) return;
  
  // 사용자가 스크롤하지 않았으면 플로팅 표시하지 않음
  if (!hasUserScrolled) return;
  
  if (!chatDateFloatDiv) {
    chatDateFloatDiv = document.createElement('div');
    chatDateFloatDiv.id = 'chat-date-float';
    chatDateFloatDiv.style.position = 'fixed';
    chatDateFloatDiv.style.background = 'rgba(40,40,40,0.95)';
    chatDateFloatDiv.style.color = '#fff';
    chatDateFloatDiv.style.fontSize = '0.75rem';
    chatDateFloatDiv.style.fontWeight = 'bold';
    chatDateFloatDiv.style.padding = '4px 12px';
    chatDateFloatDiv.style.borderRadius = '12px';
    chatDateFloatDiv.style.zIndex = '9999';
    chatDateFloatDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
    chatDateFloatDiv.style.display = 'none';
    chatDateFloatDiv.style.transition = 'opacity 0.3s ease-in-out';
    chatDateFloatDiv.style.whiteSpace = 'nowrap';
    chatDateFloatDiv.style.overflow = 'hidden';
    chatDateFloatDiv.style.textOverflow = 'ellipsis';
    chatDateFloatDiv.style.maxWidth = '250px';
    
    // body에 추가
    document.body.appendChild(chatDateFloatDiv);
  }
  
  // 채팅 카드의 위치를 기준으로 플로팅 위치 계산
  const chatCard = document.querySelector('.chat-card');
  if (chatCard) {
    const chatCardRect = chatCard.getBoundingClientRect();
    const top = chatCardRect.top + 60; // 채팅 카드 상단에서 60px 아래 (헤더 아래)
    const left = chatCardRect.left + (chatCardRect.width / 2); // 채팅 카드 중앙
    
    chatDateFloatDiv.style.top = top + 'px';
    chatDateFloatDiv.style.left = left + 'px';
    chatDateFloatDiv.style.transform = 'translateX(-50%)';
  } else {
    // 채팅 카드를 찾을 수 없는 경우 기본 위치 사용
    chatDateFloatDiv.style.top = '140px';
    chatDateFloatDiv.style.left = '50%';
    chatDateFloatDiv.style.transform = 'translateX(-50%)';
  }
  
  // 이미 표시 중이면 날짜가 다를 때만 업데이트하고 타이머 리셋
  if (chatDateFloatDiv.style.display === 'block') {
    const currentText = chatDateFloatDiv.textContent;
    const newText = formatDateToKorean(dateStr);
    
    // 날짜가 다르면 텍스트 업데이트
    if (currentText !== newText) {
      chatDateFloatDiv.textContent = newText;
    }
    
    // 타이머 리셋
    if (chatDateFloatTimer) clearTimeout(chatDateFloatTimer);
    chatDateFloatTimer = setTimeout(() => {
      if (chatDateFloatDiv) {
        chatDateFloatDiv.style.transition = 'opacity 0.3s ease-in-out'; // 사라질 때는 애니메이션 적용
        chatDateFloatDiv.style.opacity = '0';
        setTimeout(() => {
          if (chatDateFloatDiv) chatDateFloatDiv.style.display = 'none';
        }, 300);
      }
    }, 1500);
    return;
  }
  
  chatDateFloatDiv.textContent = formatDateToKorean(dateStr);
  chatDateFloatDiv.style.display = 'block';
  chatDateFloatDiv.style.opacity = '1';
  chatDateFloatDiv.style.transition = 'none'; // 즉시 표시
  
  if (chatDateFloatTimer) clearTimeout(chatDateFloatTimer);
  chatDateFloatTimer = setTimeout(() => {
    if (chatDateFloatDiv) {
      chatDateFloatDiv.style.transition = 'opacity 0.3s ease-in-out'; // 사라질 때는 애니메이션 적용
      chatDateFloatDiv.style.opacity = '0';
      setTimeout(() => {
        if (chatDateFloatDiv) chatDateFloatDiv.style.display = 'none';
      }, 300);
    }
  }, 1500);
}

function hideChatDateFloat(immediate) {
  if (chatDateFloatTimer) clearTimeout(chatDateFloatTimer);
  if (chatDateFloatDiv) {
    if (immediate) {
      chatDateFloatDiv.style.transition = 'opacity 0.3s ease-in-out';
      chatDateFloatDiv.style.opacity = '0';
      setTimeout(() => {
        if (chatDateFloatDiv) chatDateFloatDiv.style.display = 'none';
      }, 300);
    } else {
      chatDateFloatTimer = setTimeout(() => {
        if (chatDateFloatDiv) {
          chatDateFloatDiv.style.transition = 'opacity 0.3s ease-in-out';
          chatDateFloatDiv.style.opacity = '0';
          setTimeout(() => {
            if (chatDateFloatDiv) chatDateFloatDiv.style.display = 'none';
          }, 300);
        }
      }, 1500);
    }
  }
}

// 날짜 구분선 생성
function createDateDivider(dateStr) {
  const divider = document.createElement('div');
  divider.className = 'chat-date-divider';
  divider.setAttribute('data-date', dateStr);
  
  const dateText = document.createElement('span');
  dateText.textContent = formatDateToKorean(dateStr);
  
  divider.appendChild(dateText);
  return divider;
}

// 채팅 스크롤 시 날짜 구분선 기준으로 플로팅 표시 (카카오톡 방식)
function handleChatBoxScroll() {
  // 자동 스크롤인 경우 플로팅 표시하지 않음
  if (isAutoScroll) return;
  
  const chatBox = document.getElementById('chat-box');
  const dateDividers = Array.from(chatBox.querySelectorAll('.chat-date-divider'));
  
  // 사용자가 스크롤했음을 표시
  hasUserScrolled = true;
  
  // 스크롤 중임을 표시
  isScrolling = true;
  
  // 이전 타이머 클리어
  if (chatScrollTimer) {
    clearTimeout(chatScrollTimer);
  }
  
  // 스크롤 중에는 항상 날짜 플로팅 표시
  if (dateDividers.length > 0) {
    // 현재 화면에 보이는 날짜 구분선 찾기 (카카오톡 방식)
    let visibleDivider = null;
    const chatBoxRect = chatBox.getBoundingClientRect();
    
    // 화면 상단에서 가장 가까운 날짜 구분선 찾기
    let closestDivider = null;
    let minDistance = Infinity;
    
    for (const divider of dateDividers) {
      const rect = divider.getBoundingClientRect();
      
      // 구분선이 화면 위쪽에 있는 경우 (과거 메시지)
      if (rect.bottom <= chatBoxRect.top + 20) {
        const distance = chatBoxRect.top - rect.bottom;
        if (distance < minDistance) {
          minDistance = distance;
          closestDivider = divider;
        }
      }
    }
    
    // 위쪽에 구분선이 없으면, 화면 안에 있는 가장 위쪽 구분선 찾기
    if (!closestDivider) {
      for (const divider of dateDividers) {
        const rect = divider.getBoundingClientRect();
        
        // 구분선이 화면 안에 있는 경우
        if (rect.top >= chatBoxRect.top && rect.bottom <= chatBoxRect.bottom) {
          if (!closestDivider || rect.top < closestDivider.getBoundingClientRect().top) {
            closestDivider = divider;
          }
        }
      }
    }
    
    // 화면 안에도 없으면, 화면 아래쪽에 있는 가장 가까운 구분선 찾기
    if (!closestDivider) {
      for (const divider of dateDividers) {
        const rect = divider.getBoundingClientRect();
        
        // 구분선이 화면 아래쪽에 있는 경우 (최신 메시지)
        if (rect.top >= chatBoxRect.bottom - 20) {
          const distance = rect.top - chatBoxRect.bottom;
          if (distance < minDistance) {
            minDistance = distance;
            closestDivider = divider;
          }
        }
      }
    }
    
    visibleDivider = closestDivider;
    
    if (visibleDivider) {
      const dateStr = visibleDivider.getAttribute('data-date');
      if (dateStr) {
        showChatDateFloat(dateStr);
      }
    }
  } else {
    // 날짜 구분선이 없으면 플로팅 숨김
    hideChatDateFloat(true);
  }
  
  // 스크롤이 멈춘 후 1.5초 뒤에 플로팅 숨김
  chatScrollTimer = setTimeout(() => {
    isScrolling = false;
    hideChatDateFloat(false);
  }, 1500);
}

// DB에서 가져온 장소 데이터를 기존 일정 형식으로 변환
function convertPlacesToScheduleFormat(places) {
    const schedule = {};
    
    places.forEach(place => {
        const dayKey = `${place.day_number}일차`;
        if (!schedule[dayKey]) {
            schedule[dayKey] = [];
        }
        
        const placeData = {
            name: place.place_name,
            address: place.place_address,
            type: place.place_type,
            time: place.visit_time,
            photoUrl: place.photo_url,
            order: place.place_order,
            xy: [place.longitude, place.lat], // [경도, 위도] 순서
            lat: place.lat,
            lon: place.longitude
        };
        
        schedule[dayKey].push(placeData);
    });
    
    return schedule;
}

function removeScheduleContainer() {
    const container = document.getElementById('schedule-container');
    if (container) container.remove();
    // show-map 클래스 제거
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.classList.remove('show-map');
    // 지도 영역 숨김
    const mapArea = document.getElementById('map-area');
    if (mapArea) mapArea.style.display = 'none';
}

if (document.getElementById('newChatRoomBtn')) {
    document.getElementById('newChatRoomBtn').onclick = function() {
        currentRoomId = null;
        document.getElementById('chat-box').innerHTML = '';
        welcomeMessageTime = null;
        hasUserScrolled = false; // 새 채팅방 생성 시 스크롤 상태 초기화
        resetMapAndScheduleUI(true);
    };
}
