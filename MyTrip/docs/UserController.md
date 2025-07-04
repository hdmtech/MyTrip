# UserController

- **위치**: `src/main/java/com/hyservice/mytrip/controller/UserController.java`
- **역할**: 사용자 인증, 로그인/회원가입/게스트 모드 등 사용자 관련 HTTP 요청 처리

## 주요 기능 및 핵심 코드

### 1. 로그인/회원가입/게스트/로그아웃
```java
@GetMapping("/login")
public String loginPage() { return "login"; }

@PostMapping("/login")
public String loginProcess(@RequestParam("username") String username, @RequestParam("password") String password, HttpSession session, Model model) {
    User user = userService.findByUsername(username);
    if (user != null && user.getPassword().equals(password)) {
        session.setAttribute("user", username);
        return "redirect:/chat";
    } else {
        model.addAttribute("error", "일치하는 회원정보가 없습니다.");
        return "login";
    }
}

@PostMapping("/register")
public String registerProcess(@RequestParam("username") String username, @RequestParam("password") String password, Model model) {
    if (userService.findByUsername(username) != null) {
        model.addAttribute("registerError", "이미 존재하는 아이디입니다.");
        return "login";
    }
    userService.registerUser(username, password);
    model.addAttribute("registerSuccess", "회원가입이 완료되었습니다.");
    return "login";
}

@PostMapping("/guest")
public String guestLogin(HttpSession session) {
    session.setAttribute("user", "");
    return "redirect:/chat";
}

@GetMapping("/logout")
public String logout(HttpSession session) {
    session.invalidate();
    return "redirect:/login";
}
```

- **연관 서비스**: `UserService`
- **주요 역할**: 로그인, 회원가입, 게스트 모드, 로그아웃 등 사용자 인증/관리 