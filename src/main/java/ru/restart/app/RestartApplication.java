package ru.restart.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@Modulithic(systemName = "Restart", sharedModules = "common")
@SpringBootApplication
public class RestartApplication {

    public static void main(String[] args) {
        SpringApplication.run(RestartApplication.class, args);
    }
}
