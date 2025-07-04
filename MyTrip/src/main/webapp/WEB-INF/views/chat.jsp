<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<head>
    <title>MyTrip</title>
    <link rel="stylesheet" type="text/css" href="/css/chat.css" />
    <link rel="stylesheet" type="text/css" href="/css/common/custom-alert.css" />
    <script src="${googleMapsApiUrl}?key=${googleMapsApiKey}"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/locale/ko.js"></script>
    <link rel="icon" href="/img/favicon/favicon.ico" type="image/x-icon">
</head>
<body>
    <div class="container">
        <div class="map-schedule-wrapper">
            <div id="map-area" style="display:none; position:relative;"></div>
            <!-- 일정 하단 영역은 JS에서 자동 생성 -->
        </div>
        <div class="chat-card">
            <% String userName = (session.getAttribute("user") != null) ? session.getAttribute("user").toString() : ""; %>
            <% if (!userName.isEmpty() && !userName.equals("guest")) { %>
            <div id="sidebar" class="sidebar">
                <div class="chat-room-list-wrapper">
                    <div class="chat-room-list-header">
                        <button id="backBtn" class="back-btn" title="뒤로가기">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18l-6-6 6-6" stroke="#1f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <span class="chat-room-title">채팅방 목록</span>
                        <button id="newChatRoomBtn" class="new-chat-btn">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <ul id="chatRoomList"></ul>
                </div>
            </div>
            <div id="sidebar-overlay" class="sidebar-overlay"></div>
            <% } %>
            <div class="chat-header">
                <% if (!userName.isEmpty() && !userName.equals("guest")) { %>
                <button id="hamburgerBtn" class="hamburger-btn" title="메뉴">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="#2563eb"/>
                    </svg>
                </button>
                <% } %>
                <span class="chat-title">MyTrip</span>
                <div class="chat-header-actions">
                    <button id="settingsBtn" class="settings-btn" title="설정">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path fill="#fff" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94s-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.21-0.38-0.28-0.59-0.2l-2.39,0.96c-0.5-0.38-1.05-0.7-1.66-0.94L14.5,2.5C14.47,2.22,14.24,2,13.96,2h-3.92 c-0.28,0-0.51,0.22-0.54,0.5l-0.36,2.49c-0.61,0.24-1.16,0.56-1.66,0.94l-2.39-0.96c-0.22-0.09-0.47-0.01-0.59,0.2l-1.92,3.32 c-0.12,0.21-0.07,0.47,0.12,0.61l2.03,1.58C4.88,11.36,4.86,11.68,4.86,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.21,0.38,0.28,0.59,0.2l2.39-0.96c0.5,0.38,1.05,0.7,1.66,0.94l0.36,2.49 c0.03,0.28,0.26,0.5,0.54,0.5h3.92c0.28,0,0.51-0.22,0.54-0.5l0.36-2.49c0.61-0.24,1.16-0.56,1.66-0.94l2.39,0.96 c0.22,0.09,0.47,0.01,0.59-0.2l1.92-3.32c0.12-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5 s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z"/>
                        </svg>
                    </button>
                    <div id="settingsPopup" class="settings-popup" style="display:none;">
                        <button id="aiModelBtn" class="settings-popup-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            &nbsp;AI 모델 변경&nbsp;
                        </button>
                        <button id="themeBtn" class="settings-popup-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            색상테마 변경
                        </button>
                        <hr class="settings-divider">
                        <button id="logoutBtn" class="settings-popup-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            채팅 종료
                        </button>
                    </div>
                </div>
            </div>
            <div id="chat-box"></div>
            <div class="chat-input-area">
                <textarea id="input-box" placeholder="메시지를 입력해주세요." autocomplete="off" rows="1"></textarea>
                <button id="send-btn">전송</button>
            </div>
        </div>
    </div>
    <script src="/js/common/custom-alert.js"></script>
    <script src="/js/chat.js"></script>
    <script>
        window.userName = '<%= session.getAttribute("user") != null ? session.getAttribute("user") : "" %>';
    </script>
</body>
</html> 