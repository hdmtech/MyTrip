<%
    String user = (String) session.getAttribute("user");
    if (user != null && !user.isEmpty()) {
        response.sendRedirect("/chat");
        return;
    }
%>
<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<head>
    <title>MyTrip</title>
    <link rel="stylesheet" type="text/css" href="/css/login.css" />
    <link rel="stylesheet" type="text/css" href="/css/common/custom-alert.css" />
    <link rel="icon" href="/img/favicon/favicon.ico" type="image/x-icon">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"/>
    <meta http-equiv="Pragma" content="no-cache"/>
    <meta http-equiv="Expires" content="0"/>
    <script>
        window.addEventListener('DOMContentLoaded', function() {
            var user = '<%= session.getAttribute("user") != null ? session.getAttribute("user") : "" %>';
            if (user && user !== '') {
                window.location.replace('/chat');
            }
        });
    </script>
</head>
<body>
<div class="login-container">
    <div class="login-card">
        <img src="/img/img/logo_icon.png" alt="MyTrip 로고" class="login-logo" style="width:180px;height:180px;display:block;margin:0 auto 4px auto;" />
        <h1 class="login-title">MyTrip</h1>
        <form id="loginForm" method="post" action="/login">
            <input type="text" name="username" placeholder="아이디" required class="login-input" />
            <input type="password" name="password" placeholder="비밀번호" required class="login-input" />
            <button type="submit">로그인</button>
        </form>
        <button id="registerBtn" type="button" class="register-btn">회원가입</button>
        <div class="login-footer">
            <p>&copy; 2025 MyTrip. All rights reserved.</p>
        </div>
        <div id="guestBtn" class="guest-link">회원가입 없이 사용하고 싶어요</div>
    </div>
</div>
<!-- 회원가입 팝업 -->
<div id="registerModal" class="modal" style="display:none;">
    <div class="modal-content">
        <span class="close" id="closeModal">&times;</span>
        <h2>회원가입</h2>
        <form id="registerForm" method="post" action="/register">
            <input type="text" name="username" placeholder="아이디" required class="login-input" />
            <input type="password" name="password" placeholder="비밀번호" required class="login-input" />
            <button type="submit">회원가입</button>
        </form>
    </div>
</div>

<span style="display:none;" data-register-error><%= request.getAttribute("registerError") != null ? request.getAttribute("registerError") : "" %></span>
<span style="display:none;" data-register-success><%= request.getAttribute("registerSuccess") != null ? request.getAttribute("registerSuccess") : "" %></span>

<script src="/js/common/custom-alert.js"></script>
<script>
// 서버에서 전달된 메시지 처리
var errorMessage = '<%= request.getAttribute("error") != null ? request.getAttribute("error") : "" %>';
var registerErrorMessage = '<%= request.getAttribute("registerError") != null ? request.getAttribute("registerError") : "" %>';
var registerSuccessMessage = '<%= request.getAttribute("registerSuccess") != null ? request.getAttribute("registerSuccess") : "" %>';

if (errorMessage) {
    showCustomAlert(errorMessage);
}
if (registerErrorMessage) {
    showCustomAlert(registerErrorMessage);
}
if (registerSuccessMessage) {
    showCustomAlert(registerSuccessMessage);
}
</script>

<script src="/js/login.js"></script>
</body>
</html> 