package com.hyservice.mytrip.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import api.service.UserService;
import common.model.User;
import jakarta.servlet.http.HttpSession;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/")
    public String rootLoginPage() {
        return "login";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @PostMapping("/login")
    public String loginProcess(@RequestParam("username") String username, 
                              @RequestParam("password") String password, 
                              HttpSession session, 
                              Model model) {
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
    public String registerProcess(@RequestParam("username") String username, 
                                 @RequestParam("password") String password, 
                                 Model model) {
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
} 