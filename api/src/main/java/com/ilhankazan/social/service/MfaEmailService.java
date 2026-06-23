package com.ilhankazan.social.service;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.MfaCode;
import com.ilhankazan.social.repository.MfaCodeRepository;
import com.ilhankazan.social.service.email.EmailMessage;
import com.ilhankazan.social.service.email.EmailService;
import com.ilhankazan.social.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MfaEmailService {

    private static final int CODE_DIGITS = 6;
    private static final long TTL_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;

    private final MfaCodeRepository mfaCodeRepository;
    private final EmailService emailService;

    @Transactional
    public void issueCode(Account account) {
        mfaCodeRepository.invalidateActiveForAccount(account.getId());

        String code = TokenGenerator.generateNumericCode(CODE_DIGITS);
        mfaCodeRepository.save(MfaCode.builder()
            .account(account)
            .codeHash(TokenGenerator.hashToken(code))
            .expiresAt(Instant.now().plus(TTL_MINUTES, ChronoUnit.MINUTES))
            .build());

        emailService.enqueue(new EmailMessage(
            account.getEmail(),
            "SocialHan doğrulama kodun",
            "MFA_CODE",
            Map.of("code", code, "minutes", String.valueOf(TTL_MINUTES))
        ));
    }

    @Transactional
    public boolean verify(Long accountId, String code) {
        MfaCode mfaCode = mfaCodeRepository
            .findTopByAccountIdAndUsedAtIsNullOrderByCreatedAtDesc(accountId)
            .orElse(null);

        if (mfaCode == null
            || mfaCode.getExpiresAt().isBefore(Instant.now())
            || mfaCode.getAttempts() >= MAX_ATTEMPTS) {
            return false;
        }

        if (!TokenGenerator.hashToken(code).equals(mfaCode.getCodeHash())) {
            mfaCode.setAttempts(mfaCode.getAttempts() + 1);
            mfaCodeRepository.save(mfaCode);
            return false;
        }

        mfaCode.setUsedAt(Instant.now());
        mfaCodeRepository.save(mfaCode);
        return true;
    }
}
