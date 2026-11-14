import { GoogleGenAI, Type } from '@google/genai';
import type { SuggestedChallengePayload } from '../db/schema.ts';

export interface CoachContext {
  language: 'vi' | 'en';
  userName: string;
  goals: string[];
  fears: string[];
  confidenceLevel: number;
  completedCount: number;
  recentHistory: Array<{ role: string; content: string }>;
  userMessage: string;
}

export interface CoachResult {
  reply: string;
  reflectiveQuestion: string;
  suggestedChallenge: SuggestedChallengePayload | null;
  source: 'gemini' | 'fallback';
}

function buildFallbackCoach(ctx: CoachContext): CoachResult {
  const msg = ctx.userMessage.toLowerCase();
  const isVi = ctx.language === 'vi';

  const isProcrastination =
    /trì hoãn|lười|chậm|hoàn hảo|bắt đầu|deadline|lướt|điện thoại|ngâm|procrastin|delay|perfect|start|doomscroll/.test(
      msg
    );
  const isPublicSpeaking =
    /nói|thuyết trình|phát biểu|lớp|đám đông|họp|public|speak|present|class|audience|meeting/.test(
      msg
    );
  const isBoundaries =
    /từ chối|kèo|nhờ|ranh giới|sợ giận|ngại nói không|say no|boundar|invite|favor/.test(msg);
  const isSocial =
    /bắt chuyện|giao tiếp|kết bạn|nhóm|lạ|cà phê|một mình|social|conversation|talk|people|friend|solo/.test(
      msg
    );
  const isRejection =
    /từ chối|đánh giá|chê|sai|thất bại|đăng|mạng|reject|judge|critic|fail|mistake|post/.test(msg);

  if (isProcrastination) {
    return {
      source: 'fallback',
      reply: isVi
        ? `${ctx.userName} ơi, lúc nhìn deadline to đùng mà cứ cầm điện thoại lướt là phản ứng né căng thẳng cực kỳ bình thường — không phải do bạn lười đâu. Đừng ép mình "làm hết cho hoàn hảo" ngay lúc này: hãy áp dụng Quy tắc 2 phút (Atomic Habits) — mở file lên và làm một bản nháp xấu xí trong đúng 5 phút thôi.`
        : `${ctx.userName}, reaching for your phone before a big deadline is a classic stress-avoidance loop, not laziness. Drop the pressure to finish it cleanly right now: use the 2-Minute Rule — open the exact file and produce an intentionally messy 5-minute starter draft.`,
      reflectiveQuestion: isVi
        ? 'Cái việc nhỏ xíu mất đúng 2 phút để mở khóa nhiệm vụ hôm nay (ví dụ: mở file và viết 3 gạch đầu dòng) là gì?'
        : 'What is the tiniest 2-minute opener (like opening the doc and typing 3 ugly bullet points) you can do right now?',
      suggestedChallenge: {
        title: isVi
          ? 'Bản nháp xấu xí 5 phút cho deadline đang kẹt'
          : '5-minute ugly draft sprint for your stuck deadline',
        description: isVi
          ? 'Bỏ điện thoại sang bên, mở đúng file cần làm và gõ 5 gạch đầu dòng thô nhất có thể trong 5 phút. Hết 5 phút được quyền dừng nếu muốn.'
          : 'Put your phone away, open the exact file, and type 5 rough bullet points in 5 minutes. You are allowed to stop after 5 minutes.',
        category: 'procrastination',
        difficulty: 'tiny',
        estimatedMinutes: 5,
        rewardPoints: 15,
      },
    };
  }

  if (isBoundaries) {
    return {
      source: 'fallback',
      reply: isVi
        ? `Rất nhiều người ngại nói "không" vì sợ làm phật lòng bạn bè, nhưng nhận lời khi mình đang quá tải chỉ khiến cả hai bên đều mệt. Một câu từ chối ngắn, chân thành và không bịa lý do dài dòng luôn được tôn trọng nhiều hơn bạn nghĩ.`
        : `Saying yes when you are exhausted only breeds quiet burnout. A short, warm "no" without over-apologizing or inventing excuses is actually respected far more than you fear.`,
      reflectiveQuestion: isVi
        ? 'Nếu bạn bè nhắn câu tương tự cho bạn ("Hôm nay mình cần nghỉ/chạy deadline nên hẹn hôm khác nhé"), bạn có giận họ không?'
        : 'If a friend sent you that exact same honest message ("I need tonight to rest/catch up, let’s reschedule"), would you be upset with them?',
      suggestedChallenge: {
        title: isVi
          ? 'Từ chối khéo 1 kèo hoặc việc ngoài kế hoạch để giữ giờ cho mình'
          : 'Kindly decline 1 extra invite or favor to protect your time',
        description: isVi
          ? 'Gửi tin nhắn ngắn: "Cảm ơn cậu rủ nha, tối nay mình cần giải quyết việc riêng/nghỉ sớm nên hẹn dịp khác nhé!" — không giải thích thêm.'
          : 'Send a brief note: "Thanks for thinking of me! I need tonight for my own tasks/rest, so let’s catch up next week."',
        category: 'opinions',
        difficulty: 'easy',
        estimatedMinutes: 5,
        rewardPoints: 15,
      },
    };
  }

  if (isPublicSpeaking) {
    return {
      source: 'fallback',
      reply: isVi
        ? `${ctx.userName}, ai trước khi mở mic cũng tim đập nhanh cả — não chỉ đang tăng năng lượng giúp bạn tập trung thôi. Đừng cố nói như diễn giả, hãy áp dụng Quy tắc 5 giây: viết sẵn đúng 1 ý ngắn 20 giây và giơ tay ngay trước khi đầu óc kịp nghĩ ra lý do thoái lui.`
        : `${ctx.userName}, a racing heart before unmuting is normal energy, not a sign you will fail. Skip trying to sound polished: write down one crisp 20-second point and raise your hand within 5 seconds before your mind talks you out of it.`,
      reflectiveQuestion: isVi
        ? 'Điều bạn muốn người nghe hiểu được nhất từ 1 câu nói ngắn của bạn hôm nay là gì?'
        : 'What is the one simple point you want people to hear if you only speak for 20 seconds?',
      suggestedChallenge: {
        title: isVi
          ? 'Mở mic / giơ tay góp 1 ý ngắn trong buổi học hoặc họp tới'
          : 'Unmute or raise your hand once with a 20-second point',
        description: isVi
          ? 'Viết sẵn 1 câu hỏi hoặc góp ý ra note trước khi vào buổi họp/học và nói ngay khi có khoảng nghỉ tự nhiên.'
          : 'Write 1 short question or point in your notes beforehand and share it at the first natural pause.',
        category: 'public_speaking',
        difficulty: 'easy',
        estimatedMinutes: 10,
        rewardPoints: 20,
      },
    };
  }

  if (isSocial) {
    return {
      source: 'fallback',
      reply: isVi
        ? `Cảm giác ngại sượng khi ở nơi đông người hay lúc đi một mình là do "hiệu ứng sân khấu" — mình tưởng ai cũng đang nhìn, nhưng thật ra ai cũng bận việc của họ. Hôm nay thử hạ áp lực xuống mức tối thiểu: chỉ cần có mặt tự nhiên hoặc hỏi 1 câu nhỏ liên quan ngay tới bối cảnh chung.`
        : `That awkward feeling in social spaces comes from the Spotlight Effect — it feels like everyone is watching, when in reality everyone is busy with their own day. Lower the bar today: just stay present without scrolling or ask one light contextual question.`,
      reflectiveQuestion: isVi
        ? 'Trong 24 giờ tới, khoảnh khắc đời thường nào (ở quán cà phê, lớp học hay thang máy) dễ để bạn thử tự nhiên nhất?'
        : 'In the next 24 hours, which everyday spot (a café, class, or hallway) feels easiest to test this calmly?',
      suggestedChallenge: {
        title: isVi
          ? 'Ngồi cà phê / ăn trưa một mình 15 phút không lướt điện thoại'
          : 'Have coffee or lunch solo for 15 minutes without phone scrolling',
        description: isVi
          ? 'Gọi món bạn thích, cất điện thoại vào túi trong 15 phút đầu và quan sát nhịp sống xung quanh thật thoải mái.'
          : 'Order something you enjoy, tuck your phone away for 15 minutes, and just exist comfortably in public.',
        category: 'alone',
        difficulty: 'easy',
        estimatedMinutes: 15,
        rewardPoints: 15,
      },
    };
  }

  if (isRejection) {
    return {
      source: 'fallback',
      reply: isVi
        ? `Khi mình tự kiểm duyệt vì sợ người khác chê "làm màu" hay "chưa đủ xịn", mình vô tình tước mất cơ hội trưởng thành của chính mình. Hãy thử tư duy "Show Your Work": chia sẻ quá trình thật ở mức 75–80% thay vì giấu mãi chờ hoàn hảo.`
        : `Self-censoring out of fear of looking "try-hard" or imperfect quietly steals your own momentum. Try the "Show Your Work" mindset: share an honest 75–80% milestone instead of hiding until everything feels flawless.`,
      reflectiveQuestion: isVi
        ? 'Nếu bạn đăng hoặc gửi thứ này đi hôm nay, điều tệ nhất thực tế có thể xảy ra là gì — và bạn xử lý được không?'
        : 'If you ship or post this today, what is the realistic worst-case scenario — and could you handle it?',
      suggestedChallenge: {
        title: isVi
          ? 'Đăng hoặc gửi 1 sản phẩm/bài học của bạn khi đạt 80% (sửa tối đa 2 lần)'
          : 'Publish or send 1 piece of your work at 80% ready',
        description: isVi
          ? 'Viết ngắn gọn điều bạn vừa làm hoặc học được, đếm 5-4-3-2-1 và gửi đi/đăng lên mà không sửa đi sửa lại.'
          : 'Write a brief update on what you learned or made, count 5-4-3-2-1, and share without endless editing.',
        category: 'failure',
        difficulty: 'medium',
        estimatedMinutes: 10,
        rewardPoints: 25,
      },
    };
  }

  return {
    source: 'fallback',
    reply: isVi
      ? `Mình hiểu cảm giác của ${ctx.userName}. Thay vì cố nghĩ một bước thật lớn rồi lại ngán ngẩm bỏ dở, mình chọn đúng 1 việc thực tế mất 5–10 phút mà làm xong bạn sẽ thấy nhẹ cả người tối nay.`
      : `I hear you, ${ctx.userName}. Instead of aiming for a huge leap that feels overwhelming, let’s pick one grounded 5–10 minute action that genuinely makes tonight feel lighter.`,
    reflectiveQuestion: isVi
      ? 'Việc nào bạn đang né tránh nhất hôm nay — một deadline chưa mở file hay một lời muốn nói với ai đó?'
      : 'What feels heavier right now — a real-life deadline you haven’t opened yet, or something you want to say to someone?',
    suggestedChallenge: {
      title: isVi
        ? 'Chốt 1 nhiệm vụ "Phải xong" trong Lịch & làm 5 phút mở màn'
        : 'Pick 1 Must-Do task in your schedule & run a 5-min starter',
      description: isVi
        ? 'Ghi 1 việc quan trọng nhất hôm nay vào mục Việc & Lịch, rồi chạy đúng 5 phút khởi động không chạm điện thoại.'
        : 'Add today’s #1 priority to Tasks & Plan and finish one phone-free 5-minute starter sprint.',
      category: 'procrastination',
      difficulty: 'tiny',
      estimatedMinutes: 5,
      rewardPoints: 10,
    },
  };
}

export async function generateCoachReply(ctx: CoachContext): Promise<CoachResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return buildFallbackCoach(ctx);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const langInstruction =
      ctx.language === 'vi'
        ? 'Respond in natural, modern, conversational Vietnamese (gần gũi, thực tế, không sáo rỗng kiểu văn mẫu hay sách giáo khoa).'
        : 'Respond in natural, modern, down-to-earth English (conversational, practical, zero generic motivational clichés).';

    const systemInstruction = `You are BRAVE Coach — a sharp, warm, down-to-earth companion who helps people overcome everyday social hesitation AND beat procrastination on their real-life tasks/deadlines.
Rules:
1. ${langInstruction}
2. Never sound stiff, robotic, or preachy. Validate briefly, then give concrete, relatable real-life advice (drawing naturally from behavioral tools like the 2-Minute Rule, 5-Second Rule, Ugly First Drafts, Spotlight Effect, or Nonviolent Communication when relevant).
3. If the user mentions deadlines, studying, work, or procrastinating, prioritize practical anti-procrastination action over unrelated social stunts so they never fall behind on real responsibilities.
4. Never diagnose mental illness or replace professional healthcare. If severe distress/self-harm appears, offer warm care and encourage contacting trusted people or local support.
5. Keep reply concise (2-4 crisp sentences), ask ONE grounded reflective question, and propose ONE realistic, modern real-life challenge tailored to confidence ${ctx.confidenceLevel}/10, goals (${ctx.goals.join(', ') || 'growth'}), and fears (${ctx.fears.join(', ') || 'hesitation'}).`;

    const historyText = ctx.recentHistory
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    const prompt = `User name: ${ctx.userName}
Completed challenges so far: ${ctx.completedCount}
Recent conversation:
${historyText || '(New conversation)'}

User's latest message: ${ctx.userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Warm, grounded, non-cliché response in the active language.',
            },
            reflectiveQuestion: {
              type: Type.STRING,
              description: 'One practical, specific reflective question.',
            },
            suggestedChallenge: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  description:
                    'One of: procrastination, social, public_speaking, communication, opinions, failure, rejection, judgment, alone, new_things, criticism, leadership',
                },
                difficulty: {
                  type: Type.STRING,
                  description: 'One of: tiny, easy, medium, difficult',
                },
                estimatedMinutes: { type: Type.INTEGER },
                rewardPoints: { type: Type.INTEGER },
              },
              required: [
                'title',
                'description',
                'category',
                'difficulty',
                'estimatedMinutes',
                'rewardPoints',
              ],
            },
          },
          required: ['reply', 'reflectiveQuestion'],
        },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      return buildFallbackCoach(ctx);
    }

    const parsed = JSON.parse(raw) as {
      reply?: string;
      reflectiveQuestion?: string;
      suggestedChallenge?: SuggestedChallengePayload;
    };

    if (!parsed.reply) {
      return buildFallbackCoach(ctx);
    }

    return {
      reply: parsed.reply,
      reflectiveQuestion: parsed.reflectiveQuestion || '',
      suggestedChallenge: parsed.suggestedChallenge || null,
      source: 'gemini',
    };
  } catch (error) {
    console.warn('Gemini coach unavailable, using rule-based fallback:', error);
    return buildFallbackCoach(ctx);
  }
}
