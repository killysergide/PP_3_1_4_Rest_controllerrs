package ru.kata.spring.boot_security.demo.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.Set;

public class UserRequestDTO {
    @NotBlank(message = "Username cannot be empty")
    private String username;

    @Size(min = 3, message = "Password must be at least 3 characters")
    private String password;

    private Set<String> roles;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }
}