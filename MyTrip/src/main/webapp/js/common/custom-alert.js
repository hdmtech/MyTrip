/**
 * 커스텀 Alert 팝업 함수
 * @param {string} message - 표시할 메시지
 * @param {function} callback - 확인 버튼 클릭 시 실행할 콜백 함수 (선택사항)
 */
function showCustomAlert(message, callback) {
    // 기존 alert가 있다면 제거
    const existingAlert = document.querySelector('.custom-alert-overlay');
    if (existingAlert) {
        existingAlert.remove();
    }

    // HTML 생성
    const alertHTML = `
        <div class="custom-alert-overlay">
            <div class="custom-alert-popup">
                <div class="custom-alert-header">
                    <span class="custom-alert-close">&times;</span>
                </div>
                <div class="custom-alert-content">
                    <div class="custom-alert-message">${message}</div>
                    <button class="custom-alert-button">확인</button>
                </div>
            </div>
        </div>
    `;

    // DOM에 추가
    document.body.insertAdjacentHTML('beforeend', alertHTML);

    // 요소 참조
    const overlay = document.querySelector('.custom-alert-overlay');
    const closeBtn = document.querySelector('.custom-alert-close');
    const confirmBtn = document.querySelector('.custom-alert-button');

    // 닫기 함수
    function closeAlert() {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        overlay.querySelector('.custom-alert-popup').style.animation = 'slideOut 0.2s ease-out';
        
        setTimeout(() => {
            overlay.remove();
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 200);
    }

    // 이벤트 리스너 등록
    closeBtn.addEventListener('click', closeAlert);
    confirmBtn.addEventListener('click', closeAlert);

    // 팝업창 밖 클릭 시 닫히지 않도록 (이벤트 전파 방지)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            // 팝업창 밖 클릭 시 아무 동작 안함
            e.stopPropagation();
        }
    });

    // ESC 키로 닫기 (선택사항)
    const handleEscKey = function(e) {
        if (e.key === 'Escape') {
            closeAlert();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    // 포커스 관리를 위한 탭 트랩 (접근성 향상)
    const focusableElements = overlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
        firstElement.focus();
    }

    // 탭 키로 포커스 순환
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

/**
 * 커스텀 Confirm 팝업 함수
 * @param {string} message - 표시할 메시지
 * @param {function} onConfirm - 확인 버튼 클릭 시 실행할 콜백 함수
 * @param {function} onCancel - 취소 버튼 클릭 시 실행할 콜백 함수 (선택사항)
 * @param {string} confirmText - 확인 버튼 텍스트 (기본값: "확인")
 * @param {string} cancelText - 취소 버튼 텍스트 (기본값: "취소")
 */
function showCustomConfirm(message, onConfirm, onCancel, confirmText = "확인", cancelText = "취소") {
    // 기존 confirm이 있다면 제거
    const existingConfirm = document.querySelector('.custom-confirm-overlay');
    if (existingConfirm) {
        existingConfirm.remove();
    }

    // HTML 생성
    const confirmHTML = `
        <div class="custom-confirm-overlay">
            <div class="custom-confirm-popup">
                <div class="custom-confirm-header">
                    <span class="custom-confirm-close">&times;</span>
                </div>
                <div class="custom-confirm-content">
                    <div class="custom-confirm-message">${message.replace(/\n/g, '<br>')}</div>
                    <div class="custom-confirm-buttons">
                        <button class="custom-confirm-cancel-btn">${cancelText}</button>
                        <button class="custom-confirm-ok-btn">${confirmText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // DOM에 추가
    document.body.insertAdjacentHTML('beforeend', confirmHTML);

    // 요소 참조
    const overlay = document.querySelector('.custom-confirm-overlay');
    const closeBtn = document.querySelector('.custom-confirm-close');
    const cancelBtn = document.querySelector('.custom-confirm-cancel-btn');
    const confirmBtn = document.querySelector('.custom-confirm-ok-btn');

    // 닫기 함수
    function closeConfirm() {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        overlay.querySelector('.custom-confirm-popup').style.animation = 'slideOut 0.2s ease-out';
        
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }

    // 확인 함수
    function handleConfirm() {
        closeConfirm();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    }

    // 취소 함수
    function handleCancel() {
        closeConfirm();
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
    }

    // 이벤트 리스너 등록
    closeBtn.addEventListener('click', handleCancel);
    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);

    // 팝업창 밖 클릭 시 닫히지 않도록 (이벤트 전파 방지)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            // 팝업창 밖 클릭 시 아무 동작 안함
            e.stopPropagation();
        }
    });

    // ESC 키로 취소
    const handleEscKey = function(e) {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    // 포커스 관리를 위한 탭 트랩 (접근성 향상)
    const focusableElements = overlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
        firstElement.focus();
    }

    // 탭 키로 포커스 순환
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

function showCustomRadio({ message, options, defaultValue, onConfirm, onCancel, confirmText = "확인", cancelText = "취소" }) {
    if (document.querySelector('.custom-alert-overlay')) return; // 중복 방지

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';

    const popup = document.createElement('div');
    popup.className = 'custom-alert-popup';

    // 메시지
    const msgDiv = document.createElement('div');
    msgDiv.className = 'custom-alert-message';
    msgDiv.innerHTML = message;

    // 라디오 그룹
    const radioGroup = document.createElement('div');
    radioGroup.className = 'custom-radio-group';
    options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'custom-radio-label';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'custom-radio-choice';
        radio.value = opt.value;
        if (opt.value === defaultValue) radio.checked = true;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt.label));
        radioGroup.appendChild(label);
    });

    // 버튼 영역
    const btnDiv = document.createElement('div');
    btnDiv.className = 'custom-alert-buttons';

    const okBtn = document.createElement('button');
    okBtn.className = 'custom-alert-button';
    okBtn.textContent = confirmText;

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'custom-alert-button';
    cancelBtn.textContent = cancelText;

    btnDiv.appendChild(okBtn);
    btnDiv.appendChild(cancelBtn);

    popup.appendChild(msgDiv);
    popup.appendChild(radioGroup);
    popup.appendChild(btnDiv);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // 확인 버튼
    okBtn.onclick = function () {
        const checked = radioGroup.querySelector('input[type=radio]:checked');
        if (checked) {
            if (onConfirm) onConfirm(checked.value);
            document.body.removeChild(overlay);
        }
    };
    // 취소 버튼
    cancelBtn.onclick = function () {
        if (onCancel) onCancel();
        document.body.removeChild(overlay);
    };
    // ESC로 닫기
    overlay.tabIndex = -1;
    overlay.focus();
    overlay.onkeydown = function (e) {
        if (e.key === 'Escape') {
            if (onCancel) onCancel();
            document.body.removeChild(overlay);
        }
    };
    // 창 밖 클릭 시 닫히지 않음 (아무것도 하지 않음)
    overlay.addEventListener('mousedown', function(e) {
        if (e.target === overlay) {
            // 아무 동작도 하지 않음
        }
    });
}

// 기존 alert 함수를 커스텀 alert로 대체 (선택사항)
// window.alert = showCustomAlert; 