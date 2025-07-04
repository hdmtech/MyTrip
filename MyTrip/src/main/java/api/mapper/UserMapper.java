package api.mapper;

import common.model.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    User findByUsername(@Param("username") String username);
    
    void insertUser(@Param("username") String username, @Param("password") String password);
} 