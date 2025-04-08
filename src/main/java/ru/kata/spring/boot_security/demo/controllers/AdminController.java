package ru.kata.spring.boot_security.demo.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import ru.kata.spring.boot_security.demo.models.Role;
import ru.kata.spring.boot_security.demo.models.User;
import ru.kata.spring.boot_security.demo.services.UserService;

import javax.persistence.EntityNotFoundException;
import java.security.Principal;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public String adminPage(Model model, Principal principal,
                            @RequestParam(value = "showForm", defaultValue = "false") boolean showForm) {
        User user = userService.findByUsername(principal.getName());
        model.addAttribute("currentUser", user);
        model.addAttribute("users", userService.getAllUsers());
        model.addAttribute("allRoles", userService.getAllRoles());
        model.addAttribute("newUser", new User());
        model.addAttribute("showForm", showForm);

        return "admin";
    }

    @PostMapping("/new")
    public String createUser(@ModelAttribute("newUser") User user,
                             @RequestParam(value = "selectedRoles", required = false) List<Integer> selectedRoles) {
        if (selectedRoles != null) {
            Set<Role> roles = selectedRoles.stream()
                    .map(roleId -> userService.getRoleById(roleId))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            user.setRoles(roles);
        }
        userService.save(user);
        return "redirect:/admin";
    }

    @PostMapping("/edit/{id}")
    public String updateUser(@PathVariable int id,
                             @ModelAttribute("editUser") User user,
                             @RequestParam(value = "selectedRoles", required = false) List<Integer> selectedRoles) {
        System.out.println("Editing user with ID: " + id);
        System.out.println("User object from form: " + user);

        if (user.getId() != id) {
            user.setId(id);
        }

        if (selectedRoles != null) {
            Set<Role> roles = selectedRoles.stream()
                    .map(roleId -> userService.getRoleById(roleId))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            user.setRoles(roles);
        }

        userService.update(id, user);
        return "redirect:/admin";
    }

    @GetMapping("/edit/{id}")
    public String editUserForm(@PathVariable int id, Model model, Principal principal) {
        User currentUser = userService.findByUsername(principal.getName());
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("editUser", userService.getUserById(id));
        model.addAttribute("allRoles", userService.getAllRoles());
        return "admin";
    }

    @GetMapping("/edit-form/{id}")
    public String getEditForm(@PathVariable int id, Model model) {
        User user = userService.getUserById(id);
        if (user == null) {
            throw new EntityNotFoundException("User not found with id: " + id);
        }

        model.addAttribute("user", user);
        model.addAttribute("allRoles", userService.getAllRoles());
        return "edit-user-form :: editForm";
    }

    @GetMapping("/delete-form/{id}")
    public String getDeleteForm(@PathVariable int id, Model model) {
        User user = userService.getUserById(id);
        if (user == null) {
            throw new EntityNotFoundException("User not found with id: " + id);
        }

        model.addAttribute("user", user);
        return "edit-user-form :: deleteForm";
    }


    @PostMapping("/delete/{id}")
    public String deleteUser(@PathVariable int id) {
        userService.delete(id);
        return "redirect:/admin";
    }
}