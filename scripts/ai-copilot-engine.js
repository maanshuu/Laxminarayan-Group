/**
 * Laxminarayan Group — Enterprise Real Estate AI Copilot Engine
 * 
 * Features:
 *  1. Live Gemini 1.5 Flash LLM generation (with AbortSignal timeout)
 *  2. OpenAI fallback support (gpt-4o-mini)
 *  3. Bespoke Luxury Real Estate Template Engine (Deterministic 100% reliable fallback)
 *  4. Native Multi-lingual support: English, Gujarati (ગુજરાતી), Hindi (हिन्दी)
 *  5. Context-aware prompt engineering: client details, project specifications, advisor details
 */

'use strict';

/**
 * Generate a luxury WhatsApp follow-up pitch
 */
async function generateRealEstatePitch({
  clientName = 'Valued Client',
  projName = 'Laxminarayan Residences',
  projLoc = 'Ahmedabad',
  projDesc = '',
  projCategory = 'Luxury Real Estate',
  tone = 'site_visit',
  language = 'english',
  advisorName = 'Sales Advisor',
  advisorPhone = '',
  notes = '',
  budget = '',
  customPrompt = ''
}) {
  const pName = projName || 'Laxminarayan Residences';
  const loc = projLoc ? ` (${projLoc})` : '';
  const adv = advisorName || 'Sales Advisory Team';
  const client = (clientName || 'Valued Client').trim();

  // 1. Try Google Gemini 1.5 Flash if GEMINI_API_KEY is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const sysPrompt = `You are an elite, top-tier luxury real estate sales advisor at Laxminarayan Group in Ahmedabad, Gujarat.
Write a personalized, high-converting, professional, yet warm and respectful WhatsApp follow-up pitch for a prospective property buyer.

Details:
- Client Name: ${client}
- Project: ${pName}${loc}
- Project Category: ${projCategory}
- Buyer Budget: ${budget || 'Open / Not specified'}
- Past Discussion Notes: ${notes || 'Interested in the project'}
- Advisor Name: ${adv}
- Pitch Objective: ${tone} (site_visit = invite to sample flat/villa walkthrough, highlights = key specifications & amenities, payment = discuss flexible payment schedule & quote, reengage = polite check-in)
- Desired Language: ${language} (english, gujarati, or hindi)
${customPrompt ? `- Advisor's Special Note: ${customPrompt}` : ''}

Rules:
1. Format specifically for WhatsApp: use natural emojis (📍, 🏢, 🏡, 📅, 🙏, ✨) and WhatsApp markdown (*bold* for key terms).
2. Keep it concise, engaging, and polite (under 160 words).
3. In Gujarati or Hindi, use natural, highly respectful native honorifics (e.g. નમસ્તે, સાદર પ્રણામ, શ્રીમાન).
4. Include a clear call to action (e.g. asking if a weekend visit works).
5. Output ONLY the WhatsApp message text without any extra meta-commentary or quotation marks.`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: sysPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 25) {
          return candidateText.trim();
        }
      }
    } catch (err) {
      console.warn('[AI GEMINI API WARNING] Fallback to template engine:', err.message);
    }
  }

  // 2. Try OpenAI if OPENAI_API_KEY is present
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an elite luxury real estate sales advisor at Laxminarayan Group. Output only the final WhatsApp message.' },
            { role: 'user', content: `Write a ${language} WhatsApp follow-up pitch for client ${client} interested in ${pName}${loc}. Objective: ${tone}. Advisor: ${adv}. Notes: ${notes}. ${customPrompt}` }
          ],
          temperature: 0.7,
          max_tokens: 450
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (openaiRes.ok) {
        const oData = await openaiRes.json();
        const txt = oData?.choices?.[0]?.message?.content;
        if (txt && txt.trim().length > 25) {
          return txt.trim();
        }
      }
    } catch (err) {
      console.warn('[AI OPENAI API WARNING] Fallback to template engine:', err.message);
    }
  }

  // 3. Fallback: Handcrafted High-Converting Real Estate Templates
  return generateCuratedTemplate({
    client,
    pName,
    loc,
    projLoc,
    tone,
    language,
    adv,
    advisorPhone,
    budget,
    notes,
    customPrompt
  });
}

function generateCuratedTemplate({ client, pName, loc, projLoc, tone, language, adv, advisorPhone, budget, notes, customPrompt }) {
  const extraNote = customPrompt ? `\n\n📌 *Special Update:* ${customPrompt}` : '';

  if (language === 'gujarati') {
    if (tone === 'site_visit') {
      return `નમસ્તે ${client}જી, 🙏\n\nલક્ષ્મીનારાયણ ગ્રુપ તરફથી સાદર પ્રણામ!\n\nઆપની *${pName}*${loc} પ્રોજેક્ટ સંબંધિત પૂછપરછના સંદર્ભમાં સંપર્ક કર્યો છે. અમારા સુવિધાસભર સેમ્પલ ફ્લેટ / વિલા અને ક્લબહાઉસની રૂબરૂ મુલાકાત (*Site Visit*) માટે આપને અને આપના પરિવારને સાદર આમંત્રણ પાઠવીએ છીએ.\n\n📍 *સ્થળ:* ${projLoc || 'ભાડજ, સાયન્સ સિટી રોડ પાસે'}\n🕒 *સમય:* આપની અનુકૂળતા મુજબ (સવારે 10:00 થી સાંજે 7:00)\n\nશું આ શનિવાર કે રવિવારે આપ મુલાકાત માટે સમય ફાળવી શકશો? અમે આપના સ્વાગત માટે ઉત્સુક છીએ.${extraNote}\n\nસ્નેહસહિત,\n*${adv}*\nસેલ્સ એડવાઈઝરી | લક્ષ્મીનારાયણ ગ્રુપ`;
    }
    if (tone === 'highlights') {
      return `નમસ્તે ${client}જી, 🙏\n\n*${pName}* પ્રોજેક્ટની મુખ્ય વિશેષતાઓ આપની સાથે શેર કરતાં આનંદ થાય છે:\n\n✨ *પ્રાઇમ લોકેશન:* ${projLoc || 'સાયન્સ સિટી રોડ, ભાડજ'}\n✨ *પ્લાનિંગ:* મોકળાશ ધરાવતું અલ્ટ્રા-લક્ઝરી પ્લાનિંગ અને ઉત્તમ વેન્ટિલેશન\n✨ *સુવિધાઓ:* ગ્રાન્ડ ક્લબહાઉસ, સ્વિમિંગ પૂલ અને 24x7 સિક્યોરિટી\n\nઆ પ્રોજેક્ટ આપના સપનાના આશિયાના અને રોકાણ માટે ઉત્તમ પસંદગી છે. વિગતવાર બ્રોશર અને ફ્લોર પ્લાન આપની સાથે શેર કરવા માટે ક્યારે વાત થઈ શકે?${extraNote}\n\nઆભાર,\n*${adv}*\nલક્ષ્મીનારાયણ ગ્રુપ`;
    }
    if (tone === 'payment') {
      return `નમસ્તે ${client}જી, 🙏\n\n*${pName}* માં આપના પસંદગીના યુનિટ માટે અમે આકર્ષક અને પારદર્શક પેમેન્ટ શેડ્યૂલ ઉપલબ્ધ કરાવેલ છે. આપના બજેટ અનુસાર અનુકૂળ નાણાકીય યોજના માટે અમે સહયોગ આપવા તૈયાર છીએ.\n\nવિગતવાર કોસ્ટ શીટ અને સ્પેશિયલ ઑફરની ચર્ચા માટે આપ ક્યારે અનુકૂળ રહેશો?${extraNote}\n\nશુભેચ્છાઓ સાથે,\n*${adv}*\nલક્ષ્મીનારાયણ ગ્રુપ`;
    }
    // reengage
    return `નમસ્તે ${client}જી, 🙏\n\nઆશા છે કે આપ કુશળ હશો. આપની *${pName}* પ્રોજેક્ટ અંગેની પૂછપરછ બાદ આપનો ફરી સંપર્ક સાધવા વિનંતી કરી છે.\n\nજો આપને કોઈ વધુ વિગત કે સાઇટ વિઝિટ માટે સહાયની જરૂર હોય, તો હું આપની સેવામાં હાજર છું. આપનો પ્રતિભાવ આવકાર્ય છે.${extraNote}\n\nસ્નેહસહિત,\n*${adv}*\nલક્ષ્મીનારાયણ ગ્રુપ`;
  }

  if (language === 'hindi') {
    if (tone === 'site_visit') {
      return `नमस्ते ${client} जी, 🙏\n\nलक्ष्मीनारायण ग्रुप की ओर से हार्दिक शुभकामनाएं!\n\n*${pName}*${loc} में आपकी रुचि के संदर्भ में संपर्क कर रहे हैं। हम आपको और आपके परिवार को हमारे एक्सक्लूसिव सैंपल हाउस एवं प्रीमियम क्लबहाउस का व्यक्तिगत अनुभव लेने हेतु *साइट विजिट* के लिए सादर आमंत्रित करते हैं।\n\n📍 *स्थान:* ${projLoc || 'भाडज, साइंस सिटी के निकट'}\n🕒 *समय:* आपकी सुविधानुसार (सुबह 10:00 से शाम 7:00)\n\nक्या इस वीकेंड (शनिवार या रविवार) आपकी विजिट की योजना बन सकती है? हम आपके स्वागत के लिए तत्पर हैं।${extraNote}\n\nसादर,\n*${adv}*\nसेल्स एडवाइजरी | लक्ष्मीनारायण ग्रुप`;
    }
    if (tone === 'highlights') {
      return `नमस्ते ${client} जी, 🙏\n\n*${pName}* की मुख्य विशेषताएं आपके साथ साझा करते हुए हमें अत्यंत प्रसन्नता हो रही है:\n\n✨ *प्राइम लोकेशन:* ${projLoc || 'साइंस सिटी रोड, भाडज'}\n✨ *शानदार डिजाइन:* वास्तु सम्मत विशाल लेआउट एवं प्राकृतिक रोशनी\n✨ *विश्वस्तरीय सुविधाएं:* लग्जरी क्लबहाउस, स्विमिंग पूल और 24x7 सुरक्षा\n\nअधिक जानकारी और विस्तृत फ्लोर प्लान्स देखने हेतु क्या हम आज संक्षिप्त कॉल पर बात कर सकते हैं?${extraNote}\n\nधन्यवाद,\n*${adv}*\nलक्ष्मीनारायण ग्रुप`;
    }
    if (tone === 'payment') {
      return `नमस्ते ${client} जी, 🙏\n\n*${pName}* में आपकी पसंद के यूनिट हेतु हमारे पास बेहद सुविधाजनक और पारदर्शी पेमेंट प्लान उपलब्ध है।\n\nविस्तृत कॉस्ट शीट, बैंक लोन सहायता और विशेष बुकिंग ऑफर्स की जानकारी के लिए कृपया बताएं कि आपसे कब संपर्क किया जा सकता है।${extraNote}\n\nसादर,\n*${adv}*\nलक्ष्मीनारायण ग्रुप`;
    }
    // reengage
    return `नमस्ते ${client} जी, 🙏\n\nआशा है आप सकुशल होंगे। *${pName}* में आपकी पूर्व पूछताछ के संदर्भ में यह एक छोटा सा फॉलो-अप संदेश है।\n\nयदि आपके मन में प्रोजेक्ट से संबंधित कोई प्रश्न हो या आप साइट विजिट प्लान करना चाहें, तो मुझे आपकी सहायता करने में अत्यंत खुशी होगी।${extraNote}\n\nसादर,\n*${adv}*\nलक्ष्मीनारायण ग्रुप`;
  }

  // Default: English
  if (tone === 'site_visit') {
    return `Dear ${client},\n\nGreetings from *Laxminarayan Group*! ✨\n\nFollowing up on your interest in *${pName}*${loc}, we would love to warmly invite you and your family for a private tour of our ready sample residence and executive clubhouse.\n\n📍 *Location:* ${projLoc || 'Ahmedabad'}\n🕒 *Timing:* Flexible at your convenience (10:00 AM – 7:00 PM)\n\nWould Saturday or Sunday morning work best for your private walkthrough? We look forward to hosting you!${extraNote}\n\nWarm regards,\n*${adv}*\nSales Advisory | Laxminarayan Group`;
  }
  if (tone === 'highlights') {
    return `Dear ${client},\n\nGreetings from *Laxminarayan Group*!\n\nHere are the signature highlights of *${pName}*${loc}:\n\n✨ *Prime Location:* Strategic connectivity to Science City & SG Highway\n✨ *Architecture:* Expansive luxury layouts with maximum natural light & ventilation\n✨ *Amenities:* Private clubhouse, landscaped greens, wellness zones & 24x7 security\n\nI have the complete floor plans and brochure ready for you. Would you like me to share them here on WhatsApp?${extraNote}\n\nBest regards,\n*${adv}*\nLaxminarayan Group`;
  }
  if (tone === 'payment') {
    return `Dear ${client},\n\nRegarding your enquiry for *${pName}*, we offer transparent, construction-linked payment schedules and exclusive milestone options tailored for your financial peace of mind.\n\nI would be delighted to share a customized unit cost sheet and discuss financial planning at your convenience. When would be a good time for a brief call?${extraNote}\n\nWarm regards,\n*${adv}*\nLaxminarayan Group`;
  }
  // reengage
  return `Dear ${client},\n\nHope you are having a wonderful week! ✨\n\nI am touching base regarding your recent enquiry about *${pName}*. I wanted to check if you had any questions regarding the floor plans, pricing, or current unit availability.\n\nFeel free to let me know if you would like an updated brochure or a quick site walkthrough.${extraNote}\n\nWarm regards,\n*${adv}*\nLaxminarayan Group`;
}

module.exports = {
  generateRealEstatePitch
};
