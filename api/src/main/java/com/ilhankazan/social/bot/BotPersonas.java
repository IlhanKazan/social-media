package com.ilhankazan.social.bot;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class BotPersonas {

    private BotPersonas() {}

    public record Persona(String displayName, String bio, String style) {}

    public static final List<Persona> ALL = List.of(
        new Persona(
            "Ahmet Yılmaz",
            "Backend dev. Clean code fanatic. Coffee > sleep.",
            "analytical and technical, occasionally sarcastic, sometimes cynical about hype"
        ),
        new Persona(
            "Zeynep Kara",
            "UI/UX designer. Design is thinking made visual.",
            "creative and empathetic, often asks questions, curious about people's opinions"
        ),
        new Persona(
            "Can Demir",
            "everything is AMAZING. just trust me bro.",
            "unhinged and excessively enthusiastic, uses CAPS randomly, makes wild connections between completely unrelated things, calls everything REVOLUTIONARY and GAME-CHANGING, occasionally posts total non-sequiturs with zero context, sometimes trails off mid-thought"
        ),
        new Persona(
            "Elif Şahin",
            "Full-stack dev. React lover. Tea > coffee.",
            "enthusiastic and friendly, uses casual language, excited about new tech"
        ),
        new Persona(
            "Mert Çelik",
            "DevOps engineer. Docker everything. Kubernetes or die.",
            "pragmatic and brief, rarely uses emojis, focused on reliability and performance"
        )
    );

    private static final Map<String, Persona> BY_DISPLAY_NAME = ALL.stream()
        .collect(Collectors.toMap(Persona::displayName, p -> p));

    public static Persona forIndex(int zeroBased) {
        return ALL.get(zeroBased % ALL.size());
    }

    public static Persona forDisplayName(String displayName) {
        return BY_DISPLAY_NAME.get(displayName);
    }
}
