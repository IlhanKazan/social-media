package com.ilhankazan.social.seeder;

import com.ilhankazan.social.entity.*;
import com.ilhankazan.social.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

@Slf4j
@Component
@Profile("local")
@Order(2)
@RequiredArgsConstructor
public class MockDataSeeder implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PostRepository postRepository;
    private final RepostRepository repostRepository;
    private final InteractionRepository interactionRepository;
    private final FollowRepository followRepository;
    private final PasswordEncoder passwordEncoder;

    private static final long SEED = 42L;
    private final Random random = new Random(SEED);

    private static final String[] USERNAMES = {
        "ali_yilmaz", "zeynep_kaya", "mehmet_demir", "fatma_celik", "can_aydin",
        "elif_sahin", "emre_arslan", "selin_korkmaz", "burak_dogan", "ayse_yildiz",
        "kemal_ozturk", "merve_erdogan", "oguz_sener", "ipek_akyuz", "baris_tekin",
        "ceren_ozkan", "onur_karadag", "nilan_ates", "serkan_boz", "gokce_alp",
        "james_walker", "sarah_chen", "michael_ross", "emily_carter", "david_kim",
        "jessica_lee", "ryan_smith", "amanda_jones", "chris_brown", "laura_davis",
        "alex_rodriguez", "mia_wilson", "noah_martinez", "olivia_taylor", "ethan_white",
        "chloe_harris", "liam_johnson", "sophia_thomas", "mason_jackson", "isabella_moore",
        "aiden_martin", "ava_garcia", "lucas_hernandez", "mia_lopez", "oliver_gonzalez",
        "emma_perez", "william_sanchez", "charlotte_ramirez", "james_torres", "amelia_flores"
    };

    private static final String[] DISPLAY_NAMES = {
        "Ali Yılmaz", "Zeynep Kaya", "Mehmet Demir", "Fatma Çelik", "Can Aydın",
        "Elif Şahin", "Emre Arslan", "Selin Korkmaz", "Burak Doğan", "Ayşe Yıldız",
        "Kemal Öztürk", "Merve Erdoğan", "Oğuz Şener", "İpek Akyüz", "Barış Tekin",
        "Ceren Özkan", "Onur Karadağ", "Nilan Ateş", "Serkan Boz", "Gökçe Alp",
        "James Walker", "Sarah Chen", "Michael Ross", "Emily Carter", "David Kim",
        "Jessica Lee", "Ryan Smith", "Amanda Jones", "Chris Brown", "Laura Davis",
        "Alex Rodriguez", "Mia Wilson", "Noah Martinez", "Olivia Taylor", "Ethan White",
        "Chloe Harris", "Liam Johnson", "Sophia Thomas", "Mason Jackson", "Isabella Moore",
        "Aiden Martin", "Ava Garcia", "Lucas Hernandez", "Mia Lopez", "Oliver Gonzalez",
        "Emma Perez", "William Sanchez", "Charlotte Ramirez", "James Torres", "Amelia Flores"
    };

    private static final String[] BIOS = {
        "Yazılım mühendisi. Kahve bağımlısı.",
        "Full-stack developer. Open source enthusiast.",
        "Backend geliştirici. Java & Spring Boot tutkunu.",
        "UX tasarımcı ve front-end developer.",
        "Bilgisayar mühendisi öğrencisi. Her gün öğreniyorum.",
        "Tech blogger. Yazıyorum, düşünüyorum, paylaşıyorum.",
        "Senior software engineer at a startup.",
        "Cloud architect. AWS & GCP certified.",
        "DevOps engineer. Automating everything.",
        "Mobile developer. iOS & Android.",
        "Data scientist. Making sense of data.",
        "AI researcher. Machine learning enthusiast.",
        "Freelance developer. Building cool things.",
        "Product manager turned developer.",
        "Open source contributor. Community builder.",
        "Spring Boot & microservices advocate.",
        "React developer. JavaScript everywhere.",
        "Cybersecurity professional. Stay safe online.",
        "Game developer. Unity & Unreal Engine.",
        "Embedded systems engineer.",
        null, null, null, null, null
    };

    private static final String[] POST_TEMPLATES = {
        "Spring Boot ile geliştirme yapmak gerçekten çok keyifli!",
        "Bugün yeni bir şey öğrendim. Sürekli öğrenmek en büyük motivasyonum.",
        "Kod yazarken müzik dinlemek mi, sessizlik mi tercih edersiniz?",
        "React 19 ile birlikte frontend dünyası çok değişti.",
        "Open source projelere katkı vermek en güzel öğrenme yollarından biri.",
        "Bugün çok üretken bir gündü. Hedeflerimi tamamladım!",
        "Microservices mi, monolith mu? Bu tartışma bitmez.",
        "Docker ve Kubernetes hayatı ne kadar kolaylaştırdı!",
        "Clean code yazmak bir sanattır.",
        "Test driven development'ı benimsedikten sonra kod kalitem arttı.",
        "PostgreSQL performans optimizasyonu üzerine çalışıyorum.",
        "WebSocket ile gerçek zamanlı özellikler eklemek harika.",
        "Java 21 ile virtual threads gerçekten oyun değiştirici.",
        "Tailwind CSS ile UI geliştirme çok hızlandı.",
        "Caffeine cache kullanımı API performansını ciddi artırıyor.",
        "Just shipped a new feature! The team did an amazing job.",
        "Reading about distributed systems today. So much to learn.",
        "Code review culture is underrated. It makes the whole team better.",
        "Good documentation saves more time than it costs.",
        "Debugging at 2am. The life of a developer.",
        "Finally fixed that bug that's been bothering me for days!",
        "Learning something new every single day. That's the goal.",
        "The best code is the code you don't have to write.",
        "Simplicity is the ultimate sophistication. Keep your code clean.",
        "Collaboration over competition. We all grow together.",
        "Sipariş ettiğim kitap geldi: 'Clean Architecture'. Başlıyorum!",
        "Yeni bir side project başlattım. Heyecanlıyım!",
        "Konferansta harika konuşmacılar vardı. Çok şey öğrendim.",
        "Pair programming yapmanın faydaları tartışılmaz.",
        "Algoritmalar zor ama çözünce o his paha biçilmez."
    };

    @Override
    @Transactional
    public void run(String... args) {
        if (accountRepository.count() > 0) {
            log.info("MockDataSeeder: accounts table is not empty, skipping.");
            return;
        }

        log.info("MockDataSeeder: seeding accounts and posts...");
        List<Account> accounts = seedAccounts();
        List<Post> posts = seedPosts(accounts);
        seedReposts(accounts, posts);
        seedQuotePosts(accounts, posts);
        seedLikes(accounts, posts);
        seedFollows(accounts);
        seedReplies(accounts, posts);
        log.info("MockDataSeeder: done. Created {} accounts, {} posts (including replies and quote-reposts).",
            accounts.size(), postRepository.count());
    }

    private List<Account> seedAccounts() {
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
            .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN not found"));
        Role userRole = roleRepository.findByName("ROLE_USER")
            .orElseThrow(() -> new IllegalStateException("ROLE_USER not found"));

        List<Account> accounts = new ArrayList<>();

        Account admin = new Account();
        admin.setUsername("admin_dev");
        admin.setEmail("admin@dev.local");
        admin.setPassword(passwordEncoder.encode("admin_dev_password"));
        admin.setDisplayName("Admin Dev");
        admin.setRole(adminRole);
        admin.setEmailVerified(true);
        admin.setEmailVerifiedAt(Instant.now());
        accounts.add(admin);

        for (int i = 0; i < USERNAMES.length; i++) {
            Account user = new Account();
            user.setUsername(USERNAMES[i]);
            user.setEmail(USERNAMES[i] + "@example.com");
            user.setPassword(passwordEncoder.encode("password123"));
            user.setDisplayName(DISPLAY_NAMES[i]);
            user.setBio(BIOS[random.nextInt(BIOS.length)]);
            user.setRole(userRole);
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(Instant.now());
            accounts.add(user);
        }

        return accountRepository.saveAll(accounts);
    }

    private List<Post> seedPosts(List<Account> accounts) {
        List<Post> posts = new ArrayList<>();
        List<Account> regularAccounts = accounts.subList(1, accounts.size());

        for (int i = 0; i < 200; i++) {
            Account account = regularAccounts.get(random.nextInt(regularAccounts.size()));
            Post post = new Post();
            post.setAccount(account);
            post.setContent(POST_TEMPLATES[random.nextInt(POST_TEMPLATES.length)]);
            post.setModerationStatus(ModerationStatus.CLEAN);
            post.setAdminStatus(AdminStatus.ACTIVE);
            posts.add(post);
        }

        return postRepository.saveAll(posts);
    }

    private void seedReposts(List<Account> accounts, List<Post> posts) {
        List<Repost> reposts = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        int attempts = 0;
        while (reposts.size() < 30 && attempts < 300) {
            attempts++;
            Account account = accounts.get(random.nextInt(accounts.size()));
            Post post = posts.get(random.nextInt(posts.size()));
            String key = account.getId() + ":" + post.getId();
            if (seen.add(key)) {
                Repost repost = new Repost();
                repost.setAccount(account);
                repost.setPost(post);
                reposts.add(repost);
            }
        }

        repostRepository.saveAll(reposts);
    }

    private void seedQuotePosts(List<Account> accounts, List<Post> posts) {
        List<Post> quotePosts = new ArrayList<>();
        List<Account> regularAccounts = accounts.subList(1, accounts.size());

        for (int i = 0; i < 50; i++) {
            Account account = regularAccounts.get(random.nextInt(regularAccounts.size()));
            Post quoted = posts.get(random.nextInt(posts.size()));
            Post quotePost = new Post();
            quotePost.setAccount(account);
            quotePost.setContent(POST_TEMPLATES[random.nextInt(POST_TEMPLATES.length)]);
            quotePost.setQuotedPost(quoted);
            quotePost.setModerationStatus(ModerationStatus.CLEAN);
            quotePost.setAdminStatus(AdminStatus.ACTIVE);
            quotePosts.add(quotePost);
        }

        postRepository.saveAll(quotePosts);
    }

    private void seedLikes(List<Account> accounts, List<Post> posts) {
        List<Interaction> likes = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        int attempts = 0;
        while (likes.size() < 1000 && attempts < 5000) {
            attempts++;
            Account account = accounts.get(random.nextInt(accounts.size()));
            Post post = posts.get(random.nextInt(posts.size()));
            String key = account.getId() + ":" + post.getId();
            if (seen.add(key)) {
                Interaction like = new Interaction();
                like.setAccount(account);
                like.setPost(post);
                like.setType(InteractionType.LIKE);
                likes.add(like);
            }
        }

        interactionRepository.saveAll(likes);
    }

    private void seedFollows(List<Account> accounts) {
        List<Follow> follows = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        int attempts = 0;
        while (follows.size() < 100 && attempts < 500) {
            attempts++;
            Account follower = accounts.get(random.nextInt(accounts.size()));
            Account following = accounts.get(random.nextInt(accounts.size()));
            if (follower.getId().equals(following.getId())) {
                continue;
            }
            String key = follower.getId() + ":" + following.getId();
            if (seen.add(key)) {
                Follow follow = new Follow();
                follow.setFollower(follower);
                follow.setFollowing(following);
                follows.add(follow);
            }
        }

        followRepository.saveAll(follows);
    }

    private void seedReplies(List<Account> accounts, List<Post> tops) {
        List<Post> topLevel = tops.stream()
            .filter(p -> p.getParentPost() == null)
            .toList();

        if (topLevel.isEmpty()) {
            return;
        }

        List<Post> replies = new ArrayList<>();
        List<Account> regularAccounts = accounts.subList(1, accounts.size());

        for (int i = 0; i < 80; i++) {
            Post parent = topLevel.get(random.nextInt(topLevel.size()));
            Account account = regularAccounts.get(random.nextInt(regularAccounts.size()));
            Post reply = new Post();
            reply.setAccount(account);
            reply.setContent(POST_TEMPLATES[random.nextInt(POST_TEMPLATES.length)]);
            reply.setParentPost(parent);
            reply.setModerationStatus(ModerationStatus.CLEAN);
            reply.setAdminStatus(AdminStatus.ACTIVE);
            replies.add(reply);
        }

        postRepository.saveAll(replies);
    }
}
