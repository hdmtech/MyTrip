package com.hyservice.mytrip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.mybatis.spring.annotation.MapperScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.hyservice.mytrip", "api"})
@MapperScan(basePackages = {"api.mapper"})
public class MyTripApplication {

	public static void main(String[] args) {
		SpringApplication.run(MyTripApplication.class, args);
	}

}
