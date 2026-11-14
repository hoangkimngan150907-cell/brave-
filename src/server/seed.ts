import { count } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { challengeGroups, challenges } from '../db/schema.ts';

export const SEEDED_CHALLENGES = [
  // Level 1: Warm-Up (Real-life micro courage)
  {
    slug: 'tiny-warm-smile',
    level: 1,
    titleVi: 'Nhìn thẳng và cảm ơn người phục vụ bằng nụ cười thật',
    titleEn: 'Make eye contact and warmly thank someone serving you',
    descriptionVi:
      'Lúc nhận đồ uống, nhận ship hoặc thanh toán ở cửa hàng tiện lợi, hãy rời mắt khỏi màn hình điện thoại, nhìn họ 1 giây và nói "Cảm ơn bạn nhé" thật rõ ràng.',
    descriptionEn:
      'When picking up coffee, a delivery, or checking out, look up from your phone for a second and say a warm, clear thank you.',
    stepsVi: [
      'Cất điện thoại xuống trước khi tới lượt mình.',
      'Nhìn thẳng nhẹ nhàng trong 1 giây và mỉm cười tự nhiên.',
      'Nói câu cảm ơn đủ nghe thay vì lầm bầm cho xong.',
    ],
    stepsEn: [
      'Lower your phone before it is your turn.',
      'Make brief, relaxed eye contact with a natural smile.',
      'Say a clear thank you instead of rushing away.',
    ],
    category: 'social',
    difficulty: 'tiny',
    estimatedMinutes: 5,
    rewardPoints: 10,
    completionCriteriaVi: 'Chủ động tương tác ấm áp với 1 người ngoài đời thật hôm nay.',
    completionCriteriaEn: 'Have 1 warm, present micro-interaction today.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'tiny-say-hello',
    level: 1,
    titleVi: 'Gửi bản nháp "xấu xí" 5 phút cho việc đang ngâm cả tuần',
    titleEn: 'Do a 5-minute "ugly draft" on a task you kept avoiding',
    descriptionVi:
      'Thay vì đợi có hứng hay sợ làm chưa hay, hãy mở đúng file bài tập/công việc bạn đang né, bấm đồng hồ 5 phút và gõ những dòng đầu tiên thật thô.',
    descriptionEn:
      'Instead of waiting for inspiration, open the exact assignment or work doc you have been avoiding, set a 5-minute timer, and type messy starter lines.',
    stepsVi: [
      'Chọn đúng 1 task đang làm bạn thấy nặng đầu nhất.',
      'Cho phép bản thân viết/làm ở mức 5/10, không chỉnh sửa.',
      'Hết 5 phút, nếu muốn dừng vẫn tính là hoàn thành thử thách!',
    ],
    stepsEn: [
      'Pick the single task weighing on your mind most.',
      'Give yourself permission to produce a 5/10 rough start.',
      'After 5 minutes, stopping still counts as a complete win.',
    ],
    category: 'procrastination',
    difficulty: 'tiny',
    estimatedMinutes: 5,
    rewardPoints: 10,
    completionCriteriaVi: 'Mở việc ra và làm liên tục 5 phút không lướt điện thoại.',
    completionCriteriaEn: 'Work 5 distraction-free minutes on an avoided task.',
    sourceType: 'handbook',
    handbookRef: 'Atomic Habits · Quy tắc 2 phút',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'tiny-first-message',
    level: 1,
    titleVi: 'Nhắn trả lời 1 tin nhắn/email bạn đã "seen" mấy ngày rồi',
    titleEn: 'Reply to 1 message or email you left on read for days',
    descriptionVi:
      'Đừng để cảm giác tội lỗi vì trả lời muộn kéo dài thêm nữa. Nhắn một câu ngắn gọn, chân thành ngay bây giờ để nhẹ đầu.',
    descriptionEn:
      'Stop letting reply guilt snowball. Send a short, honest message right now and free up your mental space.',
    stepsVi: [
      'Mở đúng đoạn chat/email bạn cứ định tối trả lời rồi lại quên.',
      'Mở đầu tự nhiên: "Xin lỗi mình rep hơi trễ, phần này mình..."',
      'Bấm gửi luôn mà không đọc đi đọc lại quá 2 lần.',
    ],
    stepsEn: [
      'Open that one thread you kept postponing until later.',
      'Start simply: "Sorry for the late reply — here is where I am..."',
      'Hit send without rereading more than twice.',
    ],
    category: 'rejection',
    difficulty: 'tiny',
    estimatedMinutes: 5,
    rewardPoints: 10,
    completionCriteriaVi: 'Giải quyết dứt điểm ít nhất 1 tin nhắn bị ngâm.',
    completionCriteriaEn: 'Clear at least 1 overdue reply.',
    sourceType: 'handbook',
    handbookRef: 'Atomic Habits · Giảm ma sát hành động',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'tiny-simple-question',
    level: 1,
    titleVi: 'Nhờ nhân viên quán chỉnh món đúng ý thay vì "ngại phiền"',
    titleEn: 'Ask a barista or clerk for a small adjustment instead of settling',
    descriptionVi:
      'Ít đá, bớt ngọt, đổi size hoặc hỏi vị trí món đồ — tập nói ra nhu cầu nhỏ của mình một cách lịch sự, tự nhiên.',
    descriptionEn:
      'Less ice, less sugar, or asking where something is — practice voicing a small personal preference politely instead of staying quiet.',
    stepsVi: [
      'Chọn một yêu cầu nhỏ hợp lý khi đi mua đồ hoặc ăn uống.',
      'Nói rõ ràng, nhẹ nhàng kèm lời cảm ơn.',
      'Ghi nhận: hỏi thẳng nhanh và dễ chịu hơn tự chịu đựng rất nhiều.',
    ],
    stepsEn: [
      'Pick one reasonable small preference at a shop or café.',
      'Ask clearly and warmly with a thank you.',
      'Notice how quick and normal it actually feels.',
    ],
    category: 'judgment',
    difficulty: 'tiny',
    estimatedMinutes: 5,
    rewardPoints: 10,
    completionCriteriaVi: 'Chủ động yêu cầu hoặc hỏi lại 1 điều nhỏ đúng ý mình.',
    completionCriteriaEn: 'Politely ask for 1 small adjustment you want.',
    sourceType: 'handbook',
    handbookRef: 'Rejection Proof (Jia Jiang)',
    isPublic: true,
    isActive: true,
  },

  // Level 2: Real-Life Social & Boundaries
  {
    slug: 'social-start-conversation',
    level: 2,
    titleVi: 'Đi cà phê hoặc ăn trưa một mình 20 phút không dán mắt vào điện thoại',
    titleEn: 'Go for coffee or lunch solo for 20 minutes without doomscrolling',
    descriptionVi:
      'Ngồi một mình thoải mái, nhâm nhi đồ uống hoặc đọc vài trang sách thay vì cầm điện thoại giả vờ đang nhắn tin cho đỡ sượng.',
    descriptionEn:
      'Sit solo with your drink or notebook without using your phone as an armor shield against looking alone.',
    stepsVi: [
      'Chọn một quán bạn thích và gọi món cho riêng mình.',
      'Để điện thoại úp xuống hoặc trong túi suốt 20 phút đầu.',
      'Thở chậm và tận hưởng cảm giác tự do khi không ai soi xét bạn cả.',
    ],
    stepsEn: [
      'Pick a spot you enjoy and order for yourself.',
      'Keep your phone face-down or pocketed for the first 20 minutes.',
      'Notice how freeing it feels once the spotlight illusion fades.',
    ],
    category: 'alone',
    difficulty: 'easy',
    estimatedMinutes: 20,
    rewardPoints: 15,
    completionCriteriaVi: 'Ngồi một mình tự nhiên ít nhất 15–20 phút không dùng điện thoại.',
    completionCriteriaEn: 'Spend 15–20 calm minutes solo without scrolling.',
    sourceType: 'handbook',
    handbookRef: 'The Spotlight Effect · Tự tin khi một mình',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'social-share-opinion',
    level: 2,
    titleVi: 'Chốt quán ăn hoặc khung giờ bạn thích thay vì nói "sao cũng được"',
    titleEn: 'Pick the spot or time slot instead of saying "whatever works"',
    descriptionVi:
      'Khi hội bạn hoặc nhóm làm việc đang đùn đẩy chọn địa điểm hay phương án, hãy đưa ra 1 lựa chọn cụ thể mà bạn thật sự muốn.',
    descriptionEn:
      'When your friend group or team goes in circles deciding what to do, step in and propose one concrete option you actually prefer.',
    stepsVi: [
      'Nghĩ trước 1 quán/khung giờ hợp lý.',
      'Nói hoặc nhắn gọn: "Mình vote quán A lúc 7h nhé, mọi người thấy sao?"',
      'Giữ tâm thế thoải mái dù mọi người đồng ý hay điều chỉnh thêm.',
    ],
    stepsEn: [
      'Choose one concrete option that genuinely works for you.',
      'Propose it clearly: "How about spot A at 7 PM?"',
      'Stay relaxed regardless of tweaks.',
    ],
    category: 'opinions',
    difficulty: 'easy',
    estimatedMinutes: 5,
    rewardPoints: 15,
    completionCriteriaVi: 'Đưa ra 1 đề xuất cụ thể trong nhóm thay vì im lặng.',
    completionCriteriaEn: 'Propose 1 concrete preference in a group chat or hangout.',
    sourceType: 'handbook',
    handbookRef: 'Set Boundaries, Find Peace',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'social-ask-for-help',
    level: 2,
    titleVi: 'Từ chối khéo 1 kèo hoặc việc nhờ vả khi bạn cần giữ thời gian cho mình',
    titleEn: 'Kindly say "no" to 1 invite or favor when you need rest or focus',
    descriptionVi:
      'Không bịa lý do dài dòng, không xin lỗi quá mức — nói rõ rằng hôm nay bạn ưu tiên nghỉ ngơi hoặc chạy deadline riêng.',
    descriptionEn:
      'No elaborate excuses or over-apologizing — clearly protect your evening for rest or an urgent deadline.',
    stepsVi: [
      'Dùng câu ngắn: "Cảm ơn cậu rủ nha, hôm nay mình cần giải quyết việc riêng/nghỉ sớm nên hẹn dịp khác nhé."',
      'Giữ giọng thân thiện nhưng dứt khoát.',
      'Dùng khoảng thời gian vừa bảo vệ cho đúng việc bạn cần.',
    ],
    stepsEn: [
      'Reply warmly and clearly: "Thanks for inviting me! I need tonight to recharge/catch up on work, so let’s aim for next week."',
      'Skip guilt-driven over-explaining.',
      'Spend that reclaimed time on your real priority.',
    ],
    category: 'opinions',
    difficulty: 'easy',
    estimatedMinutes: 5,
    rewardPoints: 15,
    completionCriteriaVi: 'Nói lời từ chối tử tế 1 lần mà không tự trách mình.',
    completionCriteriaEn: 'Say 1 kind, guilt-free "no".',
    sourceType: 'handbook',
    handbookRef: 'Set Boundaries · Nonviolent Communication',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'social-join-group',
    level: 2,
    titleVi: 'Nhắn hỏi lại giảng viên, sếp hoặc teammate chỗ mình chưa rõ thay vì tự đoán mò',
    titleEn: 'Ask a classmate, teacher, or teammate to clarify instead of guessing',
    descriptionVi:
      'Đừng mất 2 tiếng tự mò chỉ vì ngại hỏi sợ bị nghĩ là "không biết gì". Hỏi sớm 1 câu giúp tiết kiệm cả buổi.',
    descriptionEn:
      'Do not waste two hours guessing in silence out of fear of looking clueless. Ask one clear question early.',
    stepsVi: [
      'Tóm tắt ngắn điều bạn đã thử tìm hiểu trước.',
      'Hỏi thẳng trọng tâm: "Mình hiểu đoạn này là A, không biết có đúng ý cậu/anh/chị không?"',
      'Ghi nhận sự nhẹ nhõm khi có câu trả lời rõ ràng.',
    ],
    stepsEn: [
      'Briefly mention what you checked so far.',
      'Ask directly: "My understanding is X — could you confirm if that’s right?"',
      'Enjoy saving hours of silent stress.',
    ],
    category: 'communication',
    difficulty: 'easy',
    estimatedMinutes: 10,
    rewardPoints: 15,
    completionCriteriaVi: 'Chủ động hỏi làm rõ 1 vấn đề học tập/công việc.',
    completionCriteriaEn: 'Ask 1 clarifying question instead of guessing alone.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },

  // Level 3: Voice & Anti-Procrastination
  {
    slug: 'expressive-speak-small-group',
    level: 3,
    titleVi: 'Giơ tay hỏi hoặc góp ý 1 câu ngắn trong buổi học / cuộc họp',
    titleEn: 'Speak up once in class or a team call with 1 crisp point',
    descriptionVi:
      'Không cần phát biểu dài lê thê. Chỉ cần chuẩn bị sẵn 1 câu hỏi hoặc 1 nhận xét 20 giây và mở mic / giơ tay nói trong 5 giây đầu.',
    descriptionEn:
      'No grand speech required. Write down one 20-second question or comment and raise your hand within 5 seconds of a pause.',
    stepsVi: [
      'Ghi trước 1 gạch đầu dòng ra giấy/note.',
      'Đếm ngược 5-4-3-2-1 và giơ tay/bật mic trước khi kịp run.',
      'Nói chậm rãi vừa đủ nghe, xong là mỉm cười nhẹ.',
    ],
    stepsEn: [
      'Jot down 1 bullet point in your notes beforehand.',
      'Count 5-4-3-2-1 and unmute or raise your hand before overthinking.',
      'Deliver it calmly and let yourself feel proud afterward.',
    ],
    category: 'public_speaking',
    difficulty: 'medium',
    estimatedMinutes: 15,
    rewardPoints: 25,
    completionCriteriaVi: 'Phát biểu ít nhất 1 lần trong lớp hoặc buổi họp.',
    completionCriteriaEn: 'Speak up at least once in a class or meeting.',
    sourceType: 'handbook',
    handbookRef: 'The 5-Second Rule (Mel Robbins)',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'expressive-respectful-disagree',
    level: 3,
    titleVi: 'Nói rõ góc nhìn khác biệt một cách tôn trọng khi thảo luận nhóm',
    titleEn: 'Voice a respectful differing view during a group discussion',
    descriptionVi:
      'Khi thấy hướng đi của nhóm có điểm chưa ổn, thay vì im lặng rồi ấm ức làm theo, hãy góp ý nhẹ nhàng và đề xuất cách sửa.',
    descriptionEn:
      'When a group plan feels off, speak up constructively instead of staying quiet and feeling frustrated later.',
    stepsVi: [
      'Ghi nhận điểm hay trong ý kiến trước đó.',
      'Nối tiếp nhẹ: "Phần A rất ổn, nhưng mình hơi lo chỗ B — mình thử phương án C xem sao?"',
      'Lắng nghe phản hồi với tâm thế cùng giải quyết vấn đề.',
    ],
    stepsEn: [
      'Validate what works in the current suggestion first.',
      'Add smoothly: "I like part A, though I’m wondering about B — could we test C?"',
      'Keep the tone collaborative.',
    ],
    category: 'opinions',
    difficulty: 'medium',
    estimatedMinutes: 15,
    rewardPoints: 25,
    completionCriteriaVi: 'Nêu 1 góp ý khác chiều mang tính xây dựng.',
    completionCriteriaEn: 'Share 1 constructive counter-perspective.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'expressive-procrastination-sprint',
    level: 3,
    titleVi: 'Phiên Deep Focus 25 phút không chạm điện thoại cho việc quan trọng nhất',
    titleEn: 'Run a 25-minute phone-free sprint on your #1 priority task',
    descriptionVi:
      'Để điện thoại ở chế độ máy bay hoặc phòng khác, đóng mọi tab mạng xã hội và làm trọn 1 phiên 25 phút cho đúng nhiệm vụ đang kẹt.',
    descriptionEn:
      'Put your phone out of reach, close social tabs, and complete one clean 25-minute block on your most important task.',
    stepsVi: [
      'Viết rõ đúng 1 đầu việc vào mục Việc & Lịch hôm nay.',
      'Đặt điện thoại ra ngoài tầm với và bật bộ đếm 25 phút.',
      'Hoàn thành phiên và đánh dấu tick xanh trên To-Do List.',
    ],
    stepsEn: [
      'Pick your single #1 Must-Do task in Tasks & Plan.',
      'Move your phone away and start a 25-minute timer.',
      'Check off progress right after the block finishes.',
    ],
    category: 'procrastination',
    difficulty: 'medium',
    estimatedMinutes: 25,
    rewardPoints: 25,
    completionCriteriaVi: 'Hoàn thành trọn vẹn 1 phiên tập trung 25 phút.',
    completionCriteriaEn: 'Finish 1 full 25-minute distraction-free sprint.',
    sourceType: 'handbook',
    handbookRef: 'Deep Work · Chống trì hoãn nỗ lực',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'expressive-share-personal-idea',
    level: 3,
    titleVi: 'Đăng 1 bài/story chia sẻ điều bạn đang học hoặc làm (không xóa viết lại quá 2 lần)',
    titleEn: 'Post 1 update about what you are learning or building without over-editing',
    descriptionVi:
      'Thay vì giấu kỹ chờ khi nào thành công rực rỡ mới dám đăng, hãy chia sẻ một góc quá trình thật của bạn lên mạng hoặc nhóm học.',
    descriptionEn:
      'Instead of hiding until everything is polished, share one honest snippet of your learning process or work-in-progress.',
    stepsVi: [
      'Viết 3–5 câu ngắn chân thật về một bài học hoặc sản phẩm đang làm.',
      'Đếm 5-4-3-2-1 và bấm đăng, không chỉnh câu chữ quá 2 lần.',
      'Tắt thông báo trong 30 phút để đỡ hồi hộp canh lượt thích.',
    ],
    stepsEn: [
      'Write 3–5 honest lines about something you learned or created.',
      'Count 5-4-3-2-1 and publish without over-editing.',
      'Mute notifications for 30 minutes afterward.',
    ],
    category: 'failure',
    difficulty: 'medium',
    estimatedMinutes: 10,
    rewardPoints: 25,
    completionCriteriaVi: 'Chia sẻ công khai 1 bài viết/cập nhật quá trình thật.',
    completionCriteriaEn: 'Publish 1 genuine process update.',
    sourceType: 'handbook',
    handbookRef: 'Show Your Work (Austin Kleon)',
    isPublic: true,
    isActive: true,
  },

  // Level 4: Bold Experiences
  {
    slug: 'growth-give-presentation',
    level: 4,
    titleVi: 'Nhờ 1 người có kinh nghiệm góp ý thẳng cho CV, bài viết hoặc slide của bạn',
    titleEn: 'Ask a mentor or peer for candid feedback on your work',
    descriptionVi:
      'Chủ động gửi bản nháp của bạn và hỏi: "Chỗ nào đang yếu hoặc khó hiểu nhất?" để tập đón nhận góp ý mà không tự ái.',
    descriptionEn:
      'Send your draft to someone you respect and ask specifically what feels weakest so you normalize constructive feedback.',
    stepsVi: [
      'Chuẩn bị bản nháp gọn gàng (đạt ~75% là đủ gửi).',
      'Nhắn lịch sự xin 10 phút góp ý cụ thể vào 1 điểm.',
      'Cảm ơn họ và chọn 1 ý phù hợp nhất để sửa ngay.',
    ],
    stepsEn: [
      'Get your draft to roughly 75% ready.',
      'Politely ask for 10 minutes of focused critique.',
      'Thank them and apply the single sharpest suggestion.',
    ],
    category: 'criticism',
    difficulty: 'difficult',
    estimatedMinutes: 25,
    rewardPoints: 40,
    completionCriteriaVi: 'Gửi sản phẩm xin feedback thẳng từ ít nhất 1 người.',
    completionCriteriaEn: 'Request candid feedback from at least 1 person.',
    sourceType: 'handbook',
    handbookRef: 'Radical Candor · Đón nhận góp ý',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'growth-join-new-activity',
    level: 4,
    titleVi: 'Đi một buổi workshop, CLB hoặc lớp trải nghiệm mới mà không rủ bạn đi kèm',
    titleEn: 'Attend a workshop, club, or hobby class solo without bringing a friend',
    descriptionVi:
      'Thử một buổi chạy bộ, vẽ, boardgame hoặc workshop kỹ năng một mình — nơi bạn không quen ai trước đó.',
    descriptionEn:
      'Sign up for a creative class, meetup, or sports session solo where you do not already know anyone.',
    stepsVi: [
      'Đăng ký một buổi hợp gu trong tuần này.',
      'Đến sớm 5 phút để tự nhiên làm quen với không gian.',
      'Nói chuyện ngắn với ít nhất 1 người ngồi cạnh.',
    ],
    stepsEn: [
      'Book one session you have been curious about.',
      'Arrive 5 minutes early to settle in calmly.',
      'Exchange a brief friendly hello with 1 person nearby.',
    ],
    category: 'new_things',
    difficulty: 'difficult',
    estimatedMinutes: 30,
    rewardPoints: 40,
    completionCriteriaVi: 'Tham dự trọn vẹn 1 hoạt động mới một mình.',
    completionCriteriaEn: 'Attend 1 new session solo.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'growth-introduce-yourself',
    level: 4,
    titleVi: 'Mặc đồ đúng gu hoặc thể hiện cá tính riêng ra ngoài mà không tự kiểm duyệt',
    titleEn: 'Wear your real style out today without toning it down to blend in',
    descriptionVi:
      'Lôi món đồ bạn thích nhưng hay cất tủ vì "sợ nổi quá" ra mặc đi học, đi làm hoặc đi cà phê hôm nay.',
    descriptionEn:
      'Pull out that outfit or accessory you usually save out of self-consciousness and wear it out on a normal day.',
    stepsVi: [
      'Chọn bộ đồ khiến bạn thấy là chính mình nhất.',
      'Đi ra ngoài và giữ dáng đi thẳng, thoải mái.',
      'Ghi lại cảm giác trong Nhật ký: mọi người nhìn ít hơn bạn tưởng rất nhiều.',
    ],
    stepsEn: [
      'Pick the outfit that feels most authentically you.',
      'Wear it out with relaxed posture.',
      'Journal afterward how freeing it felt to stop hiding.',
    ],
    category: 'judgment',
    difficulty: 'difficult',
    estimatedMinutes: 20,
    rewardPoints: 40,
    completionCriteriaVi: 'Tự tin diện phong cách mình thích ra nơi công cộng.',
    completionCriteriaEn: 'Go out in an outfit you usually hesitate to wear.',
    sourceType: 'handbook',
    handbookRef: 'The Spotlight Effect',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'growth-unfamiliar-responsibility',
    level: 4,
    titleVi: 'Nộp đơn ứng tuyển / đăng ký 1 cơ hội dù cảm thấy mình mới sẵn sàng 70%',
    titleEn: 'Apply for 1 opportunity even when you feel only 70% qualified',
    descriptionVi:
      'Ngừng tự đánh trượt bản thân trước khi nhà tuyển dụng hoặc ban tổ chức kịp đọc hồ sơ của bạn.',
    descriptionEn:
      'Stop disqualifying yourself before anyone else sees your application. Finish the essentials and submit today.',
    stepsVi: [
      'Mở lại 1 cơ hội (job, học bổng, CLB, cuộc thi) bạn đã lưu từ lâu.',
      'Dành 30 phút viết rõ điểm mạnh thật của mình.',
      'Bấm nộp đơn — bất kể kết quả ra sao, bạn đã thắng sự chần chừ.',
    ],
    stepsEn: [
      'Revisit one saved role, scholarship, or contest bookmark.',
      'Spend 30 focused minutes highlighting your genuine strengths.',
      'Hit submit — winning means shipping the application.',
    ],
    category: 'failure',
    difficulty: 'difficult',
    estimatedMinutes: 30,
    rewardPoints: 40,
    completionCriteriaVi: 'Hoàn tất và bấm gửi 1 hồ sơ ứng tuyển thật.',
    completionCriteriaEn: 'Submit 1 real application.',
    sourceType: 'handbook',
    handbookRef: 'The 5-Second Rule · Hành động trước khi hoàn hảo',
    isPublic: true,
    isActive: true,
  },

  // Level 5: Lead & Ship
  {
    slug: 'beyond-lead-group-activity',
    level: 5,
    titleVi: 'Đứng ra rủ, lên lịch hoặc điều phối 1 buổi học nhóm / hangout thực tế',
    titleEn: 'Initiate and coordinate a real-life study session or group hangout',
    descriptionVi:
      'Thay vì chờ người khác rủ rồi mới đi, hãy là người tạo kèo, chọn thời gian địa điểm và kết nối mọi người.',
    descriptionEn:
      'Instead of waiting to be invited, take the lead: pick a time, suggest a spot, and bring people together.',
    stepsVi: [
      'Nhắn cho 2–4 người bạn/teammate một lời mời rõ ngày giờ.',
      'Chuẩn bị trước 2 chủ đề hoặc mục tiêu ngắn cho buổi gặp.',
      'Lưu lại cảm giác làm người kết nối trong Hành trình của bạn.',
    ],
    stepsEn: [
      'Send a clear invite with time and place to 2–4 people.',
      'Bring a light agenda or 2 conversation starters.',
      'Reflect afterward on initiating instead of waiting.',
    ],
    category: 'leadership',
    difficulty: 'milestone',
    estimatedMinutes: 30,
    rewardPoints: 60,
    completionCriteriaVi: 'Tạo kèo và điều phối thành công 1 buổi gặp/học nhóm.',
    completionCriteriaEn: 'Organize and host 1 group meetup or study block.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'beyond-speak-audience',
    level: 5,
    titleVi: 'Đảm nhận phần thuyết trình hoặc chia sẻ trước lớp / team / cộng đồng',
    titleEn: 'Take the lead presenting or demoing in front of a group',
    descriptionVi:
      'Xung phong nói phần mở đầu hoặc phần chính của bài thuyết trình nhóm thay vì nhường hết cho người khác.',
    descriptionEn:
      'Volunteer to present the opening or core demo of your team project instead of handing the mic to someone else.',
    stepsVi: [
      'Tập nói thành tiếng 2 lần (không học thuộc lòng từng chữ).',
      'Giữ hơi thở chậm ở 30 giây mở màn.',
      'Tập trung truyền đạt giá trị cho người nghe thay vì lo họ chấm điểm mình.',
    ],
    stepsEn: [
      'Rehearse aloud twice using bullet points, not a word-for-word script.',
      'Steady your breathing through the first 30 seconds.',
      'Focus on helping the audience understand, not performing perfection.',
    ],
    category: 'public_speaking',
    difficulty: 'milestone',
    estimatedMinutes: 30,
    rewardPoints: 60,
    completionCriteriaVi: 'Hoàn thành phần thuyết trình/chia sẻ trước nhóm.',
    completionCriteriaEn: 'Deliver a presentation or live demo.',
    sourceType: 'system',
    handbookRef: null,
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'beyond-difficult-conversation',
    level: 5,
    titleVi: 'Nói thẳng một cuộc trò chuyện khó nhưng cần thiết để giải tỏa hiểu lầm/ranh giới',
    titleEn: 'Have an honest, overdue conversation about boundaries or expectations',
    descriptionVi:
      'Thay vì im lặng chịu đựng rồi căng thẳng âm ỉ với bạn cùng phòng, người yêu hoặc đồng nghiệp, hãy hẹn nói chuyện thẳng thắn mà tử tế.',
    descriptionEn:
      'Instead of simmering silently with a roommate, partner, or teammate, initiate a calm, honest talk.',
    stepsVi: [
      'Viết trước điều cốt lõi theo mẫu "Khi việc X xảy ra, mình cảm thấy Y và mong tụi mình có thể Z".',
      'Chọn lúc cả hai bình tĩnh, nói chuyện riêng.',
      'Lắng nghe góc nhìn của đối phương mà không vội ngắt lời.',
    ],
    stepsEn: [
      'Frame your point cleanly: "When X happens, I feel Y, and I’d love for us to try Z."',
      'Choose a calm, private moment.',
      'Listen to their side without rushing to defend.',
    ],
    category: 'communication',
    difficulty: 'milestone',
    estimatedMinutes: 25,
    rewardPoints: 60,
    completionCriteriaVi: 'Thực hiện cuộc trao đổi thẳng thắn và tôn trọng.',
    completionCriteriaEn: 'Hold 1 honest boundary conversation.',
    sourceType: 'handbook',
    handbookRef: 'Nonviolent Communication (Marshall Rosenberg)',
    isPublic: true,
    isActive: true,
  },
  {
    slug: 'beyond-personal-milestone',
    level: 5,
    titleVi: 'Công bố/gửi đi một dự án hoặc bước ngoặt cá nhân bạn đã ấp ủ rất lâu',
    titleEn: 'Ship or launch a personal project you kept sitting on',
    descriptionVi:
      'Ra mắt trang portfolio, kênh chia sẻ, bài viết tâm huyết hoặc đăng ký cột mốc lớn mà bạn từng trì hoãn vì sợ chưa hoàn hảo.',
    descriptionEn:
      'Publish your portfolio, creative piece, or major personal milestone you kept delaying in the name of perfection.',
    stepsVi: [
      'Chốt đúng 1 danh sách kiểm tra tối giản để sản phẩm "đủ dùng và chạy được".',
      'Gửi link hoặc nhấn nút đăng công khai hôm nay.',
      'Viết 1 lá thư gửi bản thân tương lai để đánh dấu ngày bạn hết trốn.',
    ],
    stepsEn: [
      'Define a minimal "ready enough" checklist.',
      'Hit publish or share the link publicly today.',
      'Seal a Future Self letter to mark the day you stopped hiding.',
    ],
    category: 'new_things',
    difficulty: 'milestone',
    estimatedMinutes: 30,
    rewardPoints: 60,
    completionCriteriaVi: 'Công khai hoặc gửi đi cột mốc cá nhân của bạn.',
    completionCriteriaEn: 'Launch or submit your personal milestone.',
    sourceType: 'handbook',
    handbookRef: 'Show Your Work · Shipping Over Perfection',
    isPublic: true,
    isActive: true,
  },
];

export const SEEDED_GROUPS = [
  {
    slug: 'gentle-speakers',
    nameVi: 'Nhóm Luyện Nói Tự Tin',
    nameEn: 'Gentle Speakers Circle',
    descriptionVi:
      'Không gian an toàn cho những ai đang từng bước vượt qua nỗi sợ phát biểu và thuyết trình.',
    descriptionEn:
      'A calm, supportive circle for practicing speaking up and overcoming presentation anxiety step by step.',
    category: 'public_speaking',
  },
  {
    slug: 'first-hello',
    nameVi: 'Thử Thách Mở Lời & Đi Một Mình',
    nameEn: 'First Hello & Solo Confidence',
    descriptionVi:
      'Cùng nhau thực hành bắt chuyện tự nhiên, đi cà phê một mình và đặt ranh giới tử tế.',
    descriptionEn:
      'Everyday practice for warm conversations, solo coffee confidence, and kind boundaries.',
    category: 'social',
  },
  {
    slug: 'action-over-overthinking',
    nameVi: 'Hành Động 5 Phút · Thắng Trì Hoãn',
    nameEn: '5-Minute Action Over Procrastination',
    descriptionVi:
      'Dành cho những bạn hay ngâm deadline vì cầu toàn — cổ vũ nhau làm bản nháp thô và giữ nhịp To-Do.',
    descriptionEn:
      'For perfectionists who delay real tasks — cheering on ugly 5-minute drafts and steady task execution.',
    category: 'procrastination',
  },
  {
    slug: 'quiet-leaders',
    nameVi: 'Bản Lĩnh Dám Xuất Hiện',
    nameEn: 'Quiet Courage & Leadership',
    descriptionVi:
      'Phát triển khả năng nêu chính kiến, đăng tải sản phẩm cá nhân và dẫn dắt điềm tĩnh.',
    descriptionEn:
      'Growing voice, healthy boundaries, shipping work, and grounded leadership.',
    category: 'leadership',
  },
];

let seededOnce = false;

export async function ensureSeededData() {
  if (seededOnce) return;
  try {
    for (const ch of SEEDED_CHALLENGES) {
      await db
        .insert(challenges)
        .values(ch)
        .onConflictDoUpdate({
          target: challenges.slug,
          set: {
            level: ch.level,
            titleVi: ch.titleVi,
            titleEn: ch.titleEn,
            descriptionVi: ch.descriptionVi,
            descriptionEn: ch.descriptionEn,
            stepsVi: ch.stepsVi,
            stepsEn: ch.stepsEn,
            category: ch.category,
            difficulty: ch.difficulty,
            estimatedMinutes: ch.estimatedMinutes,
            rewardPoints: ch.rewardPoints,
            completionCriteriaVi: ch.completionCriteriaVi,
            completionCriteriaEn: ch.completionCriteriaEn,
            sourceType: ch.sourceType,
            handbookRef: ch.handbookRef,
            isPublic: ch.isPublic,
            isActive: ch.isActive,
          },
        });
    }

    const [{ value: groupCount }] = await db
      .select({ value: count() })
      .from(challengeGroups);

    if (groupCount < SEEDED_GROUPS.length) {
      for (const gr of SEEDED_GROUPS) {
        await db
          .insert(challengeGroups)
          .values(gr)
          .onConflictDoNothing({ target: challengeGroups.slug });
      }
    }

    seededOnce = true;
  } catch (error) {
    console.error('Error seeding initial challenges/groups:', error);
  }
}

export function evaluateBadges(params: {
  completedCount: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  completedCategories: string[];
  existingBadges: string[];
}): string[] {
  const badges = new Set(params.existingBadges || []);

  if (params.completedCount >= 1) badges.add('first_step');
  if (params.completedCount >= 5) badges.add('little_by_little');
  if (params.completedCount >= 15) badges.add('consistency_star');
  if (params.completedCategories.includes('social')) badges.add('social_butterfly');
  if (params.completedCategories.includes('public_speaking')) badges.add('fearless_speaker');
  if (params.completedCategories.includes('new_things')) badges.add('comfort_zone_explorer');
  if (params.longestStreak >= 7 || params.currentStreak >= 7) badges.add('streak_7');
  if (params.longestStreak >= 30 || params.currentStreak >= 30) badges.add('streak_30');
  if (params.longestStreak >= 100 || params.currentStreak >= 100) badges.add('streak_100');

  return Array.from(badges);
}
