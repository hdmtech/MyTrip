package api.service;

import common.model.User;

public interface UserService {
    User findByUsername(String username);
    void registerUser(String username, String password);
} 