export interface HandbookChallengeExample {
  id: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  stepsVi: string[];
  stepsEn: string[];
  category: string;
  difficulty: 'tiny' | 'easy' | 'medium' | 'difficult';
  estimatedMinutes: number;
}

export interface HandbookChapter {
  id: string;
  chapterNum: string;
  sourceBookVi: string;
  sourceBookEn: string;
  titleVi: string;
  titleEn: string;
  insightVi: string;
  insightEn: string;
  examples: HandbookChallengeExample[];
}

export const HANDBOOK_CHAPTERS: HandbookChapter[] = [
  {
    id: 'atomic_two_minute',
    chapterNum: '01',
    sourceBookVi: 'Atomic Habits (James Clear) · Quy tắc 2 phút & Bản nháp thô',
    sourceBookEn: 'Atomic Habits (James Clear) · 2-Minute Rule & Ugly First Drafts',
    titleVi: 'Chống trì hoãn bằng bước mở màn cực nhỏ',
    titleEn: 'Beat Procrastination With a 2-Minute Opener',
    insightVi:
      'Não bộ không lười — nó chỉ né cảm giác choáng ngợp khi nghĩ đến cả một deadline to đùng. Chỉ cần cam kết làm 2–5 phút "bản nháp xấu xí", ma sát tâm lý sẽ tự tan biến.',
    insightEn:
      'Your brain is not lazy — it avoids overwhelm when staring at a massive task. Commit to just 2–5 minutes of an intentionally messy first draft and resistance drops.',
    examples: [
      {
        id: 'hb-ugly-draft',
        titleVi: 'Mở file deadline đang ngâm & viết 5 dòng nháp "chưa cần hay"',
        titleEn: 'Open that avoided deadline file & write 5 messy starter lines',
        descriptionVi:
          'Thay vì chờ có cảm hứng mới làm bài tập/báo cáo, hãy mở file lên, gõ 5 gạch đầu dòng thô nhất có thể trong 5 phút rồi mới quyết định có làm tiếp hay không.',
        descriptionEn:
          'Instead of waiting for inspiration on a lingering assignment or report, open the doc and type 5 rough bullet points in 5 minutes before deciding whether to continue.',
        stepsVi: [
          'Tắt hết tab giải trí và chỉ mở đúng 1 file/trang cần làm.',
          'Đặt hẹn giờ 5 phút, tự nhắc: "Bản nháp đầu tiên được phép tệ."',
          'Viết xong 5 ý thô hoặc làm xong 1 câu hỏi đầu tiên.',
        ],
        stepsEn: [
          'Close distracting tabs and keep only the single file open.',
          'Set a 5-minute timer with the rule: "First drafts are allowed to be messy."',
          'Complete 5 rough bullets or the very first problem.',
        ],
        category: 'procrastination',
        difficulty: 'tiny',
        estimatedMinutes: 5,
      },
      {
        id: 'hb-inbox-zero-reply',
        titleVi: 'Trả lời 1 tin nhắn / email quan trọng bạn đã "seen" hơn 2 ngày',
        titleEn: 'Reply to 1 important message or email you left unread for days',
        descriptionVi:
          'Càng để lâu càng thấy ngại và tội lỗi. Hãy gửi một câu trả lời ngắn gọn, rõ ràng ngay hôm nay để giải phóng đầu óc.',
        descriptionEn:
          'The longer a reply sits, the heavier the guilt feels. Send one short, honest reply today to clear your mental bandwidth.',
        stepsVi: [
          'Chọn đúng 1 tin nhắn công việc/học tập bạn cứ chần chừ mãi.',
          'Bắt đầu bằng "Xin lỗi mình phản hồi hơi trễ, phần này mình..."',
          'Nhấn gửi ngay, không đọc đi đọc lại quá 2 lần.',
        ],
        stepsEn: [
          'Pick the one school or work message you keep postponing.',
          'Open plainly: "Thanks for your patience — here is where I am on this..."',
          'Hit send without rereading more than twice.',
        ],
        category: 'procrastination',
        difficulty: 'easy',
        estimatedMinutes: 5,
      },
    ],
  },
  {
    id: 'rejection_therapy',
    chapterNum: '02',
    sourceBookVi: 'Rejection Proof (Jia Jiang) · Liệu pháp miễn nhiễm từ chối',
    sourceBookEn: 'Rejection Proof (Jia Jiang) · Micro Rejection Exposure',
    titleVi: 'Thử hỏi điều nhỏ để bớt sợ bị từ chối',
    titleEn: 'Make Small Requests to Desensitize Rejection',
    insightVi:
      'Phần lớn nỗi sợ bị từ chối đến từ việc ta tự tưởng tượng ra kịch bản bị chê cười. Thực tế, 80% mọi người rất thân thiện — hoặc cùng lắm chỉ lắc đầu nhẹ nhàng.',
    insightEn:
      'Most fear of rejection comes from catastrophic imagination. In reality, people are surprisingly kind — and even a "no" rarely hurts once heard aloud.',
    examples: [
      {
        id: 'hb-cafe-custom',
        titleVi: 'Nhờ nhân viên quán điều chỉnh nhẹ món đồ uống hoặc đổi chỗ ngồi',
        titleEn: 'Politely ask a barista or staff for a small customization',
        descriptionVi:
          'Thay vì "ngại phiền" rồi uống ly nước quá ngọt hoặc ngồi chỗ nắng, hãy lịch sự nhờ điều chỉnh đúng ý mình.',
        descriptionEn:
          'Instead of staying quiet with a seat or drink that feels off, politely ask for the small adjustment you actually want.',
        stepsVi: [
          'Hít thở chậm 1 nhịp và giữ giọng điệu thân thiện, có "ạ/nhé".',
          'Nói rõ nhu cầu trong 1 câu ngắn gọn.',
          'Cảm ơn chân thành dù câu trả lời là được hay không.',
        ],
        stepsEn: [
          'Take one calm breath and keep a warm, polite tone.',
          'State your small request in one clear sentence.',
          'Say thank you warmly either way.',
        ],
        category: 'rejection',
        difficulty: 'tiny',
        estimatedMinutes: 5,
      },
      {
        id: 'hb-ask-feedback',
        titleVi: 'Xin góp ý thẳng thắn từ bạn bè, thầy cô hoặc mentor về sản phẩm của mình',
        titleEn: 'Ask a peer, teacher, or mentor for candid feedback on your work',
        descriptionVi:
          'Đưa bài làm/ý tưởng chưa hoàn chỉnh nhờ 1 người tin cậy góp ý 1 điểm có thể cải thiện ngay.',
        descriptionEn:
          'Show a work-in-progress to someone you respect and ask for one concrete improvement.',
        stepsVi: [
          'Chọn 1 người có chuyên môn hoặc góc nhìn khách quan.',
          'Hỏi cụ thể: "Mình đang làm phần này, theo bạn chỗ nào chưa rõ nhất?"',
          'Ghi chú lại góp ý mà không tự trách bản thân.',
        ],
        stepsEn: [
          'Pick one person whose perspective you trust.',
          'Ask specifically: "What feels weakest or least clear in this draft?"',
          'Note the feedback objectively without taking it personally.',
        ],
        category: 'criticism',
        difficulty: 'medium',
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: 'boundaries_nvc',
    chapterNum: '03',
    sourceBookVi: 'Set Boundaries, Find Peace (Nedra Tawwab) · NVC',
    sourceBookEn: 'Set Boundaries, Find Peace · Kind Assertiveness',
    titleVi: 'Nói ra mong muốn thật thay vì "sao cũng được"',
    titleEn: 'State Your Preference Instead of "Whatever Works"',
    insightVi:
      'Chiều lòng mọi người giúp bạn an toàn ngắn hạn nhưng khiến bạn kiệt sức. Đặt ranh giới nhẹ nhàng là cách tôn trọng cả bản thân lẫn người đối diện.',
    insightEn:
      'People-pleasing buys short-term comfort at the cost of quiet resentment. Kind boundaries respect both your energy and the other person.',
    examples: [
      {
        id: 'hb-say-no',
        titleVi: 'Từ chối khéo một kèo hẹn hoặc nhờ vả khi bạn thực sự cần nghỉ ngơi/chạy deadline',
        titleEn: 'Kindly decline a hangout or favor when you need rest or focus',
        descriptionVi:
          'Nói lời từ chối rõ ràng, không vòng vo bịa lý do quá đà và không cảm thấy tội lỗi.',
        descriptionEn:
          'Give a clear, polite "no" without over-apologizing or inventing elaborate excuses.',
        stepsVi: [
          'Dùng mẫu câu: "Cảm ơn cậu đã rủ, nhưng hôm nay mình cần hoàn thành việc riêng nên xin hẹn dịp khác nhé."',
          'Không thêm lời giải thích dài dòng nếu không cần thiết.',
          'Dành thời gian vừa giữ lại cho đúng việc bạn ưu tiên.',
        ],
        stepsEn: [
          'Use a clean line: "Thanks for thinking of me! I need tonight to catch up on my tasks, so let’s plan for next week."',
          'Skip lengthy guilt-driven explanations.',
          'Use the protected time on what actually matters today.',
        ],
        category: 'opinions',
        difficulty: 'easy',
        estimatedMinutes: 5,
      },
      {
        id: 'hb-pick-spot',
        titleVi: 'Chủ động đề xuất quán ăn, khung giờ hoặc phương án nhóm thay vì "tùy mọi người"',
        titleEn: 'Suggest the restaurant, time slot, or plan instead of "up to you"',
        descriptionVi:
          'Khi nhóm đang loay hoay chọn địa điểm hay cách làm, hãy đưa ra 1 lựa chọn cụ thể mà bạn thật sự thích.',
        descriptionEn:
          'Next time a group is undecided, offer one concrete option you genuinely prefer.',
        stepsVi: [
          'Chọn sẵn 1 phương án bạn thấy hợp lý nhất.',
          'Nhắn hoặc nói rõ: "Mình vote chọn chỗ A vào 7h nhé, mọi người thấy ổn không?"',
          'Thoải mái nếu mọi người chốt hoặc bàn thêm.',
        ],
        stepsEn: [
          'Pick one concrete option you genuinely like.',
          'Propose it clearly: "How about spot A at 7 PM?"',
          'Stay relaxed whether they go with it or tweak it.',
        ],
        category: 'leadership',
        difficulty: 'easy',
        estimatedMinutes: 5,
      },
    ],
  },
  {
    id: 'solitude_confidence',
    chapterNum: '04',
    sourceBookVi: 'Nghệ thuật tận hưởng sự độc lập · Thoát "hiệu ứng sân khấu"',
    sourceBookEn: 'The Spotlight Effect · Comfortable Solo Presence',
    titleVi: 'Đi một mình vẫn tự nhiên, không cần giả vờ bận',
    titleEn: 'Enjoy Doing Things Solo Without Pretending to Be Busy',
    insightVi:
      'Hiệu ứng sân khấu khiến ta tưởng ai cũng đang soi mình khi đi ăn hay ngồi quán một mình. Thực tế mọi người chỉ bận lo cho việc của chính họ.',
    insightEn:
      'The Spotlight Effect tricks us into feeling watched when solo in public. In truth, almost everyone is absorbed in their own world.',
    examples: [
      {
        id: 'hb-solo-coffee',
        titleVi: 'Đi cà phê hoặc ăn trưa một mình 20 phút mà KHÔNG dán mắt vào điện thoại',
        titleEn: 'Grab coffee or lunch solo for 20 minutes without scrolling your phone',
        descriptionVi:
          'Ngồi thưởng thức đồ uống, đọc sách hoặc ngắm phố mà không dùng điện thoại làm "lá chắn" che sự ngại ngùng.',
        descriptionEn:
          'Sit comfortably with your drink, a notebook, or just your thoughts without using your phone as a social shield.',
        stepsVi: [
          'Gọi món bạn thích và chọn một chỗ ngồi thoáng.',
          'Cất điện thoại vào túi ít nhất 15–20 phút đầu.',
          'Quan sát nhịp sống xung quanh và nhận ra không ai phán xét bạn cả.',
        ],
        stepsEn: [
          'Order something you enjoy and pick a comfortable seat.',
          'Keep your phone tucked away for the first 15–20 minutes.',
          'Notice how calm and natural it feels to just be present.',
        ],
        category: 'alone',
        difficulty: 'easy',
        estimatedMinutes: 20,
      },
      {
        id: 'hb-wear-bold',
        titleVi: 'Mặc món đồ hoặc phụ kiện bạn thích nhưng bình thường ngại nổi bật',
        titleEn: 'Wear an outfit or style you love but usually hold back on',
        descriptionVi:
          'Cho phép mình thể hiện gu cá nhân ngoài đời thật một ngày thay vì tự kiểm duyệt vì sợ ánh nhìn.',
        descriptionEn:
          'Express your real style today instead of toning yourself down out of self-consciousness.',
        stepsVi: [
          'Chọn 1 món đồ bạn từng mua rồi để tủ vì "sợ hơi nổi".',
          'Mặc ra ngoài đi học, đi làm hoặc đi dạo.',
          'Ghi nhận xem cảm giác tự do khi được là chính mình thế nào.',
        ],
        stepsEn: [
          'Pick one item you bought and rarely wear out of self-consciousness.',
          'Wear it out to class, work, or a coffee run.',
          'Notice how freeing it feels to stop self-censoring.',
        ],
        category: 'judgment',
        difficulty: 'easy',
        estimatedMinutes: 15,
      },
    ],
  },
  {
    id: 'five_second_ship',
    chapterNum: '05',
    sourceBookVi: 'The 5-Second Rule (Mel Robbins) & Show Your Work',
    sourceBookEn: 'The 5-Second Rule & Show Your Work (Austin Kleon)',
    titleVi: 'Đếm ngược 5-4-3-2-1 và bấm nút gửi đi',
    titleEn: 'Count 5-4-3-2-1 and Ship Before Overthinking Wins',
    insightVi:
      'Khoảng trễ 5 giây là lúc não bộ kịp tạo ra 10 lý do để bạn chần chừ. Đếm ngược 5-4-3-2-1 và hành động ngay khi sản phẩm đạt 75–80%.',
    insightEn:
      'Five seconds of hesitation is all your brain needs to talk you out of action. Count 5-4-3-2-1 and move while things are at 80% ready.',
    examples: [
      {
        id: 'hb-post-work',
        titleVi: 'Đăng 1 chia sẻ về điều bạn đang học/làm mà không sửa quá 2 lần',
        titleEn: 'Post one genuine update about what you are learning or building',
        descriptionVi:
          'Chia sẻ 1 bài học, góc làm việc hoặc thành quả nhỏ lên mạng xã hội/nhóm học tập thay vì chờ đến khi thật hoàn hảo mới dám đăng.',
        descriptionEn:
          'Share a short lesson, workspace snapshot, or milestone online instead of waiting until everything looks flawless.',
        stepsVi: [
          'Viết ngắn 3–5 câu chân thật về điều bạn vừa học hoặc vượt qua.',
          'Đếm ngược 5-4-3-2-1 và nhấn đăng luôn.',
          'Tắt app trong 30 phút để không soi lượt tương tác.',
        ],
        stepsEn: [
          'Write 3–5 honest lines about something you learned or shipped.',
          'Count 5-4-3-2-1 and publish without endless tweaking.',
          'Step away from checking likes for 30 minutes.',
        ],
        category: 'failure',
        difficulty: 'medium',
        estimatedMinutes: 10,
      },
      {
        id: 'hb-apply-70',
        titleVi: 'Nộp đơn/đăng ký 1 cơ hội (CLB, học bổng, việc làm) dù tự thấy mình mới đạt 70%',
        titleEn: 'Apply for 1 opportunity even when you feel only 70% ready',
        descriptionVi:
          'Đừng tự loại mình trước khi người khác kịp xem hồ sơ của bạn. Hãy hoàn thành bản ứng tuyển đủ rõ ràng và gửi đi hôm nay.',
        descriptionEn:
          'Stop rejecting yourself before anyone else sees your work. Put together a clean application and submit it today.',
        stepsVi: [
          'Chọn 1 cơ hội bạn vẫn còn lưu trong bookmark từ tuần trước.',
          'Dành 25 phút hoàn thiện CV/câu trả lời cốt lõi.',
          'Bấm gửi và tự thưởng cho bản thân một lời khen.',
        ],
        stepsEn: [
          'Pick one opportunity sitting in your saved bookmarks.',
          'Spend 25 focused minutes polishing the essentials.',
          'Hit submit and celebrate choosing growth over perfection.',
        ],
        category: 'new_things',
        difficulty: 'difficult',
        estimatedMinutes: 30,
      },
    ],
  },
];
