package com.ilhankazan.social.service.email;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class EmailTemplateRegistry {

    public String renderHtml(String templateName, Map<String, String> params) {
        String template = switch (templateName) {
            case "WELCOME" -> "<h1>Hoş geldin, {{name}}!</h1><p>MicroBlog'a katıldığın için teşekkürler. <a href=\"{{link}}\">İlk düşünceni hemen paylaş!</a></p>";
            case "PASSWORD_RESET" -> "<h3>Şifre Sıfırlama Talebi</h3><p>Hesabının şifresini sıfırlamak için bir talep aldık. İşlemi tamamlamak için <a href=\"{{resetLink}}\">buraya tıkla</a>.</p><p>Bu talebi sen yapmadıysan, bu e-postayı güvenle silebilirsin; şifren değişmeyecektir.</p>";
            case "EMAIL_VERIFICATION" -> "<h3>E-posta Doğrulama</h3><p>Hesabının e-posta adresini doğrulamak için <a href=\"{{verifyLink}}\">buraya tıkla</a>.</p>";
            case "ADMIN_ALERT" -> "<h3>E-posta Doğrulama</h3><p>Hesabının e-posta adresini doğrulamak için <a href=\"{{verifyLink}}\">buraya tıkla</a>.</p>";
            default -> "<p>Bilgilendirme: {{name}}</p>";
        };
        return applyParams(template, params);
    }

    public String renderText(String templateName, Map<String, String> params) {
        String template = switch (templateName) {
            case "WELCOME" -> "Hoş geldin, {{name}}! MicroBlog'a katıldığın için teşekkürler. İlk düşünceni hemen paylaş: {{link}}";
            case "PASSWORD_RESET" -> "Şifre sıfırlama talebiniz alındı. Şifrenizi sıfırlamak için şu bağlantıyı tarayıcınıza kopyalayın: {{resetLink}} \n\nEğer bu talebi siz yapmadıysanız lütfen bu mesajı dikkate almayın.";
            case "EMAIL_VERIFICATION" -> "E-posta adresinizi doğrulamak için şu bağlantıyı tarayıcınıza kopyalayın: {{verifyLink}}";
            case "ADMIN_ALERT" -> "E-posta adresinizi doğrulamak için şu bağlantıyı tarayıcınıza kopyalayın: {{verifyLink}}";
            default -> "Bilgilendirme: {{name}}";
        };
        return applyParams(template, params);
    }

    private String applyParams(String template, Map<String, String> params) {
        String result = template;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }
        return result;
    }
}
