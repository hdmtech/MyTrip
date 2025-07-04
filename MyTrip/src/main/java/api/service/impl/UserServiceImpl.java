package api.service.impl;

import api.mapper.UserMapper;
import api.service.UserService;
import common.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {
    @Autowired
    private UserMapper userMapper;

    @Override
    public User findByUsername(String username) {
        return userMapper.findByUsername(username);
    }

    @Override
    public void registerUser(String username, String password) {
        userMapper.insertUser(username, password);
    }
} 