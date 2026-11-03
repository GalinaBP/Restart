package ru.restart.app.payment.infrastructure;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record YooKassaNotification(String event, NotifiedObject object) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NotifiedObject(String id) {
    }
}
