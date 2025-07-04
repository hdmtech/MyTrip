// 회원가입 팝업 열기/닫기
const registerBtn = document.getElementById('registerBtn');
const registerModal = document.getElementById('registerModal');
const closeModal = document.getElementById('closeModal');
const guestBtn = document.getElementById('guestBtn');

registerBtn.onclick = function() {
    registerModal.style.display = 'flex';
}
closeModal.onclick = function() {
    registerModal.style.display = 'none';
}
// 팝업창 밖 클릭 시 닫히지 않도록 제거
// window.onclick = function(event) {
//     if (event.target === registerModal) {
//         registerModal.style.display = 'none';
//     }
// }

document.getElementById('registerForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);
    const usernameValue = form.username.value; // 입력한 아이디 기억

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });
    const html = await response.text();

    // 임시 div로 파싱
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 에러/성공 메시지 추출
    const errorMsg = tempDiv.querySelector('[data-register-error]');
    const successMsg = tempDiv.querySelector('[data-register-success]');

    if (errorMsg && errorMsg.textContent.trim()) {
        showCustomAlert(errorMsg.textContent.trim());
        // 팝업은 닫지 않음
    } else if (successMsg && successMsg.textContent.trim()) {
        showCustomAlert(successMsg.textContent.trim(), function() {
            // 성공 시 팝업 닫고 로그인 폼으로
            document.getElementById('registerModal').style.display = 'none';
            // 로그인 폼에 아이디 자동 입력, 비밀번호는 초기화
            document.querySelector('#loginForm input[name="username"]').value = usernameValue;
            document.querySelector('#loginForm input[name="password"]').value = '';
        });
        // 입력값 초기화
        form.reset();
    }
}

guestBtn.onclick = function() {
    // 커스텀 confirm 창으로 비회원 이용 여부 확인
    showCustomConfirm('비회원은 채팅내역이 저장되지 않습니다.\n비회원으로 이용하시겠습니까?', function() {
        // 확인 시 /chat으로 이동
        window.location.href = '/chat';
    });
} 