import json
from datetime import datetime
from typing import Dict, Any, List
import google.generativeai as genai
from backend.config import settings
from backend.models.database import db_helper

# Configure Google Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Comprehensive local template warnings for multi-language fallback
LOCAL_ADVISORY_TEMPLATES = {
    "Good": {
        "general": {
            "en": "Air quality is Good. It is a great day to be outdoors!",
            "hi": "हवा की गुणवत्ता अच्छी है। बाहर जाने के लिए यह एक बेहतरीन दिन है!",
            "ta": "காற்றின் தரம் நன்றாக உள்ளது. வெளியே செல்ல இது சிறந்த நாள்!",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ಉತ್ತಮವಾಗಿದೆ. ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳಿಗೆ ಇದು ಸೂಕ್ತ ದಿನ!",
            "bn": "বায়ুর মান ভালো। বাইরে যাওয়ার জন্য এটি একটি চমৎকার দিন!",
            "te": "గాలి నాణ్యత బాగుంది. ఈ రోజు బహిరంగ కార్యకలాపాలకు అనుకూలమైనది!"
        },
        "vulnerable": {
            "en": "No special precautions needed. Enjoy your outdoor activities.",
            "hi": "किसी विशेष सावधानी की आवश्यकता नहीं है। बाहरी गतिविधियों का आनंद लें।",
            "ta": "சிறப்பு முன்னெச்சரிக்கைகள் தேவையில்லை. வெளிப்புற நடவடிக்கைகளை மகிழுங்கள்.",
            "kn": "ಯಾವುದೇ ವಿಶೇಷ ಮುನ್ನೆಚ್ಚರಿಕೆ ಅಗತ್ಯವಿಲ್ಲ. ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಆನಂದಿಸಿ.",
            "bn": "কোন বিশেষ সতর্কতার প্রয়োজন নেই। আপনার বাইরের কাজ উপভোগ করুন।",
            "te": "ఎలాంటి ప్రత్యేక జాగ్రత్తలు అవసరం లేదు. మీ బహిరంగ పనులను ఆనందించండి."
        },
        "outdoor_workers": {
            "en": "Safe working conditions. Perform standard duties.",
            "hi": "सुरक्षित काम की परिस्थितियाँ। सामान्य कर्तव्यों का पालन करें।",
            "ta": "பாதுகாப்பான வேலை நிலைமைகள். சாதாரண பணிகளைச் செய்யுங்கள்.",
            "kn": "ಕೆಲಸ ಮಾಡಲು ಸುರಕ್ಷಿತ ವಾತಾವರಣ. ಸಾಮಾನ್ಯ ಕರ್ತವ್ಯಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
            "bn": "নিরাপদ কাজের পরিবেশ। স্বাভাবিক কাজকর্ম চালিয়ে যান।",
            "te": "సురక్షితమైన పని పరిస్థితులు. సాధారణ విధులను నిర్వహించండి."
        }
    },
    "Satisfactory": {
        "general": {
            "en": "Air quality is Satisfactory. Minor breathing discomfort for highly sensitive individuals.",
            "hi": "हवा की गुणवत्ता संतोषजनक है। अत्यधिक संवेदनशील लोगों को हल्की सांस लेने में तकलीफ हो सकती है।",
            "ta": "காற்றின் தரம் திருப்திகரமாக உள்ளது. மிகவும் உணர்திறன் உடையவர்களுக்கு லேசான சுவாச அசௌகரியம் ஏற்படலாம்.",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ತೃಪ್ತಿಕರವಾಗಿದೆ. ಹೆಚ್ಚು ಸೂಕ್ಷ್ಮ ವ್ಯಕ್ತಿಗಳಿಗೆ ಸಣ್ಣ ಉಸಿರಾಟದ ತೊಂದರೆ ಇರಬಹುದು.",
            "bn": "বায়ুর মান সন্তোষজনক। অত্যন্ত সংবেদনশীল ব্যক্তিদের জন্য সামান্য শ্বাসকಷ್ಟ হতে পারে।",
            "te": "గాలి నాణ్యత సంతృప్తికరంగా ఉంది. తీవ్ర సున్నితత్వం ఉన్నవారికి స్వల్ప శ్వాసಕೋశ ఇబ్బంది కలగవచ్చు."
        },
        "vulnerable": {
            "en": "Sensitive individuals should consider reducing heavy outdoor exertion.",
            "hi": "संवेदनशील व्यक्तियों को भारी बाहरी श्रम को कम करने पर विचार करना चाहिए।",
            "ta": "உணர்திறன் உள்ளவர்கள் கடுமையான வெளிப்புற உழைப்பைக் குறைக்க பரிசீலிக்க வேண்டும்.",
            "kn": "ಸೂಕ್ಷ್ಮ ವ್ಯಕ್ತಿಗಳು ಹೊರಾಂಗಣದಲ್ಲಿ ಹೆಚ್ಚಿನ ದೈಹಿಕ ಶ್ರಮವನ್ನು ಕಡಿಮೆ ಮಾಡುವುದು ಒಳ್ಳೆಯದು.",
            "bn": "সংবেদনশীল ব্যক্তিদের ভারী বহিরঙ্গন পরিশ্রম কমানোর কথা বিবেচনা করা উচিত।",
            "te": "సున్నితత్వం ఉన్నవారు బహిరంగ ప్రదేశాల్లో ఎక్కువ శ్రమతో కూడిన పనులను తగ్గించుకోవాలి."
        },
        "outdoor_workers": {
            "en": "Safe conditions. Stay hydrated and take regular breaks.",
            "hi": "सुरक्षित परिस्थितियां। हाइड्रेटेड रहें और नियमित अंतराल पर ब्रेक लें।",
            "ta": "பாதுகாப்பான நிலைமைகள். நீர்ச்சத்துடன் இருங்கள் மற்றும் வழக்கமான இடைவெளிகளை எடுங்கள்.",
            "kn": "ಸುರಕ್ಷಿತ ವಾತಾವರಣ. ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ನಿಯಮಿತವಾಗಿ ವಿರಾಮ ತೆಗೆದುಕೊಳ್ಳಿ.",
            "bn": "নিরাপদ পরিবেশ। হাইড্রেটেড থাকুন এবং নিয়মিত বিরতি নিন।",
            "te": "సురక్షితమైన పరిస్థితులు. డీహైడ్రేషన్ కాకుండా చూసుకోండి మరియు క్రమం తప్పకుండా విరామం తీసుకోండి."
        }
    },
    "Moderate": {
        "general": {
            "en": "Air quality is Moderate. Discomfort in breathing for children, elderly, and lung/heart patients.",
            "hi": "हवा की गुणवत्ता मध्यम है। बच्चों, बुजुर्गों और फेफड़ों/हृदय रोगियों के लिए सांस लेने में तकलीफ हो सकती है।",
            "ta": "காற்றின் தரம் மிதமானது. குழந்தைகள், முதியவர்கள் மற்றும் நுரையீரல்/இதய நோயாளிகளுக்கு மூச்சு விடுவதில் அசௌகரியம்.",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ಸಾಧಾರಣವಾಗಿದೆ. ಮಕ್ಕಳು, ವೃದ್ಧರು ಮತ್ತು ಶ್ವಾಸಕೋಶ/ಹೃದಯ ರೋಗಿಗಳಿಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ.",
            "bn": "বায়ুর মান মাঝারি। শিশু, বয়স্ক এবং ফুসফুস/হৃদরোগীদের শ্বাসকষ্ট হতে পারে।",
            "te": "గాలి నాణ్యత సాధారణంగా ఉంది. పిల్లలు, వృద్ధులు మరియు ఊపిరితిత్తులు/గుండె రోగులకు శ్వాస తీసుకోవడంలో ఇబ్బంది."
        },
        "vulnerable": {
            "en": "Limit prolonged outdoor activities. Keep inhalers and medication handy.",
            "hi": "लंबे समय तक बाहरी गतिविधियों को सीमित करें। इनहेलर और दवाएं पास रखें।",
            "ta": "நீண்ட நேர வெளிப்புற நடவடிக்கைகளை கட்டுப்படுத்துங்கள். இன்ஹேலர்கள் மற்றும் மருந்துகளை தயாராக வைத்திருங்கள்.",
            "kn": "ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ಮಿತಿಗೊಳಿಸಿ. ಇನ್ಹೇಲರ್ ಮತ್ತು ಔಷಧಿಗಳನ್ನು ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಿ.",
            "bn": "দীর্ঘক্ষণ বাইরে থাকা সীমিত করুন। ইনহেলার এবং ওষুধ সাথে রাখুন।",
            "te": "ఎక్కువ సమయం బహిరంగ ప్రదేశాల్లో గడపవద్దు. ఇన్హేలర్లు మరియు మందులను అందుబాటులో ఉంచుకోండి."
        },
        "outdoor_workers": {
            "en": "Take 10-minute rest breaks in well-ventilated or shaded areas every 2 hours.",
            "hi": "हर 2 घंटे में अच्छी तरह हवादार या छायादार क्षेत्रों में 10 मिनट का आराम लें।",
            "ta": "ஒவ்வொரு 2 மணி நேரத்திற்கும் நன்கு காற்றோட்டமான அல்லது நிழலான பகுதிகளில் 10 நிமிட ஓய்வு எடுங்கள்.",
            "kn": "ಪ್ರತಿ 2 ಗಂಟೆಗೊಮ್ಮೆ ನೆರಳಿನ ಜಾಗದಲ್ಲಿ 10 ನಿಮಿಷ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.",
            "bn": "প্রতি ২ ঘণ্টায় ছায়াযুক্ত বা বাতাস চলাচল করে এমন জায়গায় ১০ মিনিট বিশ্রাম নিন।",
            "te": "ప్రతి 2 గంటలకు ఒకసారి గాలి వెలుతురు ఉన్న లేదా నీడ ఉన్న ప్రదేశంలో 10 నిమిషాలు విశ్రాంతి తీసుకోండి."
        }
    },
    "Poor": {
        "general": {
            "en": "Air quality is Poor. Breathing discomfort on prolonged exposure to most people.",
            "hi": "हवा की गुणवत्ता खराब है। अधिकांश लोगों को लंबे समय तक संपर्क में रहने पर सांस लेने में तकलीफ होती है।",
            "ta": "காற்றின் தரம் மோசமாக உள்ளது. பெரும்பாலான மக்களுக்கு நீண்ட நேரம் காற்றில் இருந்தால் சுவாச அசௌகரியம் ஏற்படும்.",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ಕಳಪೆಯಾಗಿದೆ. ದೀರ್ಘಕಾಲದವರೆಗೆ ಹೊರಾಂಗಣದಲ್ಲಿದ್ದರೆ ಹೆಚ್ಚಿನ ಜನರಿಗೆ ಉಸಿರಾಟದ ತೊಂದರೆಯಾಗುತ್ತದೆ.",
            "bn": "বায়ুর মান খারাপ। দীর্ঘক্ষণ বাইরে থাকলে বেশিরভাগ মানুষেরই শ্বাসকষ্ট হতে পারে।",
            "te": "గాలి నాణ్యత క్షీణించింది. ఎక్కువ సమయం బయట గడిపితే చాలా మందికి శ్వాస తీసుకోవడం ఇబ్బందిగా మారుతుంది."
        },
        "vulnerable": {
            "en": "Avoid outdoor activities. Sensitive groups should stay indoors as much as possible.",
            "hi": "बाहरी गतिविधियों से बचें। संवेदनशील समूहों को यथासंभव घर के अंदर रहना चाहिए।",
            "ta": "வெளிப்புற நடவடிக்கைகளைத் தவிர்க்கவும். உணர்திறன் உள்ளவர்கள் முடிந்தவரை வீட்டிற்குள்ளேயே இருக்க வேண்டும்.",
            "kn": "ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ತಪ್ಪಿಸಿ. ಸೂಕ್ಷ್ಮ ಆರೋಗ್ಯದವರು ಆದಷ್ಟು ಮನೆಯೊಳಗೇ ಇರುವುದು ಉತ್ತಮ.",
            "bn": "বাইরের কাজ এড়িয়ে চলুন। সংবেদনশীল ব্যক্তিরা যতটা সম্ভব ঘরের ভেতরে থাকুন।",
            "te": "బహిరంగ కార్యకలాపాలకు దూరంగా ఉండండి. సున్నితమైన ఆరోగ్య సమస్యలు ఉన్నవారు వీలైనంత వరకు ఇంట్లోనే ఉండాలి."
        },
        "outdoor_workers": {
            "en": "Mandatory N95 mask usage. Take 15-minute breaks every hour in indoor or clean zones.",
            "hi": "अनिवार्य N95 मास्क का उपयोग। घर के अंदर या साफ क्षेत्रों में हर घंटे 15 मिनट का ब्रेक लें।",
            "ta": "கட்டாய N95 முகக்கவசம் பயன்பாடு. உட்புற அல்லது சுத்தமான பகுதிகளில் ஒவ்வொரு மணி நேரத்திற்கும் 15 நிமிட ஓய்வு எடுங்கள்.",
            "kn": "ಕಡ್ಡಾಯವಾಗಿ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ. ಪ್ರತಿ ಗಂಟೆಗೆ ಸ್ವಚ್ಛ ಪರಿಸರದಲ್ಲಿ 15 ನಿಮಿಷ ವಿರಾಮ ಪಡೆಯಿರಿ.",
            "bn": "বাধ্যতামূলক N95 মাস্ক ব্যবহার করুন। প্রতি ঘণ্টায় ঘরের ভেতরে বা পরিষ্কার জায়গায় ১৫ মিনিট বিশ্রাম নিন।",
            "te": "తప్పనిసరిగా N95 మాస్క్ ధరించాలి. ప్రతి గంటకు ఒకసారి ఇండోర్ లేదా శుభ్రమైన ప్రదేశంలో 15 నిమిషాలు విశ్రాంతి తీసుకోండి."
        }
    },
    "Very Poor": {
        "general": {
            "en": "Air quality is Very Poor. Respiratory illness on prolonged exposure. Avoid active outdoor activities.",
            "hi": "हवा की गुणवत्ता बहुत खराब है। लंबे समय तक संपर्क में रहने पर श्वसन संबंधी बीमारी हो सकती है। बाहरी गतिविधियों से बचें।",
            "ta": "காற்றின் தரம் மிகவும் மோசமாக உள்ளது. நீண்ட நேரம் காற்றில் இருந்தால் சுவாச நோய் வரலாம். வெளிப்புற நடவடிக்கைகளைத் தவிர்க்கவும்.",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ಬಹಳ ಕಳಪೆಯಾಗಿದೆ. ದೀರ್ಘಕಾಲದವರೆಗೆ ಹೊರಾಂಗಣದಲ್ಲಿದ್ದರೆ ಉಸಿರಾಟದ ಕಾಯಿಲೆಗಳು ಬರಬಹುದು.",
            "bn": "বায়ুর মান খুবই খারাপ। দীর্ঘক্ষণ বাইরে থাকলে শ্বাসকষ্টজনিত রোগ হতে পারে। বাইরের কাজ পুরোপুরি বন্ধ রাখুন।",
            "te": "గాలి నాణ్యత చాలా అధ్వాన్నంగా ఉంది. శ్వాసకోశ వ్యాధులు వచ్చే ప్రమాదం ఉంది. బహిరంగ పనులను పూర్తిగా నివారించండి."
        },
        "vulnerable": {
            "en": "Strictly stay indoors. Keep windows and doors closed. Use air purifiers if available.",
            "hi": "कड़ाई से घर के अंदर रहें। खिड़कियां और दरवाजे बंद रखें। यदि उपलब्ध हो तो एयर प्यूरीफायर का उपयोग करें।",
            "ta": "கண்டிப்பாக வீட்டிற்குள்ளேயே இருக்கவும். ஜன்னல்கள் மற்றும் கதவுகளை மூடி வைக்கவும். காற்று சுத்திகரிப்பான்களைப் பயன்படுத்தவும்.",
            "kn": "ಕಡ್ಡಾಯವಾಗಿ ಮನೆಯೊಳಗೇ ಇರಿ. ಕಿಟಕಿ ಮತ್ತು ಬಾಗಿಲುಗಳನ್ನು ಮುಚ್ಚಿಡಿ. ಏರ್ ಪ್ಯೂರಿಫೈಯರ್ ಬಳಸಿ.",
            "bn": "কঠোরভাবে ঘরের ভেতরে থাকুন। জানালা-দরজা বন্ধ রাখুন। সম্ভব হলে এয়ার পিউরিফায়ার ব্যবহার করুন।",
            "te": "కచ్చితంగా ఇంట్లోనే ఉండాలి. కిటికీలు, తలుపులు మూసి ఉంచండి. వీలైతే ఎయిర్ ప్యూరిఫైయర్లను వాడండి."
        },
        "outdoor_workers": {
            "en": "Suspend non-essential outdoor work. Provide indoor alternative workspaces. Mandatory N95 masks.",
            "hi": "गैर-आवश्यक बाहरी काम स्थगित करें। घर के अंदर वैकल्पिक कार्यस्थल प्रदान करें। N95 मास्क अनिवार्य है।",
            "ta": "அவசியமற்ற வெளிப்புற வேலைகளை நிறுத்தி வைக்கவும். உட்புற மாற்று வேலை இடங்களை வழங்கவும். முகக்கவசம் கட்டாயம்.",
            "kn": "ಅನಗತ್ಯ ಹೊರಾಂಗಣ ಕೆಲಸಗಳನ್ನು ಸ್ಥಗಿತಗೊಳಿಸಿ. ಕಡ್ಡायವಾಗಿ N95 ಮಾಸ್ಕ್ ಧರಿಸಿ.",
            "bn": "জরুরি নয় এমন বাইরের কাজ স্থগিত করুন। ঘরের ভেতরে কাজের বিকল্প ব্যবস্থা করুন। মাস্ক ব্যবহার বাধ্যতামূলক।",
            "te": "అనవసరమైన బహిరంగ పనులను నిలిపివేయండి. ప్రత్యామ్నాయ ఇండోర్ పని ప్రదేశాలను కల్పించండి. N95 మాస్క్ తప్పనిసరి."
        }
    },
    "Severe": {
        "general": {
            "en": "Air quality is Severe. Affects healthy people and seriously impacts those with existing diseases.",
            "hi": "हवा की गुणवत्ता गंभीर है। स्वस्थ लोगों को प्रभावित करती है और मौजूदा बीमारियों वाले लोगों पर गंभीर प्रभाव डालती है।",
            "ta": "காற்றின் தரம் மிக மோசமாக உள்ளது. ஆரோக்கியமான மக்களைப் பாதிக்கிறது மற்றும் ஏற்கனவே நோய் உள்ளவர்களை கடுமையாகப் பாதிக்கிறது.",
            "kn": "ವಾಯು ಗುಣಮಟ್ಟ ಗಂಭೀರ ಪರಿಸ್ಥಿತಿಯಲ್ಲಿದೆ. ಆರೋಗ್ಯವಂತ ವ್ಯಕ್ತಿಗಳ ಮೇಲೂ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ ಮತ್ತು ರೋಗಿಗಳಿಗೆ ತೀವ್ರ ತೊಂದರೆ ಉಂಟುಮಾಡುತ್ತದೆ.",
            "bn": "বায়ুর মান মারাত্মক। সুস্থ মানুষের ক্ষতি করে এবং পূর্ববর্তী রোগীদের উপর গুরুতর প্রভাব ফেলে।",
            "te": "గాలి నాణ్యత అత్యంత ప్రమాదకరంగా ఉంది. ఆరోగ్యవంతులపై కూడా తీవ్ర ప్రభావం చూపుతుంది."
        },
        "vulnerable": {
            "en": "Avoid any physical exertion. Stay inside a clean room. Seek medical help if breathing discomfort develops.",
            "hi": "किसी भी शारीरिक श्रम से बचें। एक साफ कमरे के अंदर रहें। सांस लेने में तकलीफ होने पर तुरंत चिकित्सकीय सहायता लें।",
            "ta": "எந்தவொரு உடல் உழைப்பையும் தவிர்க்கவும். சுத்தமான அறைக்குள் இருக்கவும். ஏதேனும் சுவாச அசௌகரியம் ஏற்பட்டால் மருத்துவ உதவியை நாடவும்.",
            "kn": "ಯಾವುದೇ ದೈಹಿಕ ಶ್ರಮದ ಕೆಲಸ ಮಾಡಬೇಡಿ. ಸ್ವಚ್ಛವಾದ ಕೋಣೆಯೊಳಗೆ ಇರಿ. ತೊಂದರೆಯಾದರೆ ತಕ್ಷಣ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
            "bn": "কোন শারীরিক পরিশ্রম করবেন না। পরিষ্কার ঘরের ভেতরে থাকুন। শ্বাসকষ্ট শুরু হলে অবিলম্বে চিকিৎসকের পরামর্শ নিন।",
            "te": "ఎలాంటి శారీరక శ్రమ చేయవద్దు. గాలి చొరబడని శుభ్రమైన గదిలో ఉండండి. శ్వాస తీసుకోవడం ఇబ్బందిగా అనిపిస్తే వెంటనే వైద్య సహాయం పొందండి."
        },
        "outdoor_workers": {
            "en": "Complete suspension of outdoor physical labor (construction, street vendors, manual handling). Enforce health monitoring.",
            "hi": "बाहरी शारीरिक श्रम (निर्माण, सड़क विक्रेता, शारीरिक कार्य) का पूर्ण निलंबन। स्वास्थ्य निगरानी लागू करें।",
            "ta": "வெளிப்புற உடல் உழைப்பை (கட்டுமானம், தெரு வியாபாரிகள்) முழுமையாக நிறுத்தி வைக்கவும். சுகாதார கண்காணிப்பை அமல்படுத்தவும்.",
            "kn": "ಹೊರಾಂಗಣ ದೈಹಿಕ ಕೆಲಸಗಳನ್ನು (ಕಟ್ಟಡ ನಿರ್ಮಾಣ, ಬೀದಿ ಬದಿ ವ್ಯಾಪಾರ) ಸಂಪೂರ್ಣವಾಗಿ ಸ್ಥಗಿತಗೊಳಿಸಿ.",
            "bn": "বাইরের সমস্ত শারীরিক পরিশ্রম (নির্মাণকাজ, হকার ইত্যাদি) সম্পূর্ণ বন্ধ রাখুন। স্বাস্থ্য পরীক্ষা নিশ্চিত করুন।",
            "te": "బహిరంగ శారీరక శ్రమను (నిర్మాణ పనులు, వీధి వ్యాపారాలు) పూర్తిగా నిలిపివేయాలి. ఆరోగ్య పర్యవేక్షణ చేపట్టాలి."
        }
    }
}

class AdvisoryService:
    def get_aqi_category(self, aqi: float) -> str:
        if aqi <= 50: return "Good"
        elif aqi <= 100: return "Satisfactory"
        elif aqi <= 200: return "Moderate"
        elif aqi <= 300: return "Poor"
        elif aqi <= 400: return "Very Poor"
        return "Severe"

    async def get_advisories_for_zone(self, city: str, zone: str) -> Dict[str, Any]:
        """
        Retrieve the latest advisory for a zone, or generate one if not present.
        """
        # Find latest readings for stations in this zone
        cursor = db_helper.stations.find({"city": city.lower(), "zone": zone, "active": True})
        stations = await cursor.to_list(length=20)
        
        if not stations:
            cursor = db_helper.stations.find({"city": city.lower(), "active": True})
            stations = await cursor.to_list(length=100)
            
        station_ids = [s["station_id"] for s in stations]
        
        # Get average AQI
        cursor = db_helper.aqi_readings.find(
            {"station_id": {"$in": station_ids}}
        ).sort("timestamp", -1).limit(len(station_ids))
        readings = await cursor.to_list(length=len(station_ids))
        
        avg_aqi = 150.0
        pollutants_list = ["PM2.5", "PM10"]
        if readings:
            avg_aqi = sum(r["aqi"] for r in readings) / len(readings)
            
            # Find primary pollutants
            primary_map = {}
            for r in readings:
                primary_map["PM2.5"] = primary_map.get("PM2.5", 0.0) + r["pm25"]
                primary_map["PM10"] = primary_map.get("PM10", 0.0) + r["pm10"]
                primary_map["NO2"] = primary_map.get("NO2", 0.0) + r["no2"]
                primary_map["SO2"] = primary_map.get("SO2", 0.0) + r["so2"]
                
            sorted_pol = sorted(primary_map.items(), key=lambda x: x[1], reverse=True)
            pollutants_list = [p[0] for p in sorted_pol[:2]]
            
        category = self.get_aqi_category(avg_aqi)
        
        # Check if recent advisory already exists in DB
        cutoff = datetime.utcnow() - datetime.utcfromtimestamp(0)
        exists = await db_helper.citizen_advisories.find_one(
            {"city": city.lower(), "zone": zone},
            sort=[("generated_at", -1)]
        )
        
        # If it exists and was generated in the last hour, return it
        if exists and (datetime.utcnow() - exists["generated_at"]) < timedelta(hours=1):
            exists["_id"] = str(exists["_id"])
            return exists
            
        # Compile advisory payload
        advisories = {}
        
        # Try to generate using Gemini if key is provided
        if settings.GEMINI_API_KEY:
            try:
                advisories = await self._generate_gemini_advisory(city, zone, avg_aqi, category, pollutants_list)
            except Exception as e:
                print(f"Gemini advisory generation failed: {e}. Falling back to templates.")
                advisories = LOCAL_ADVISORY_TEMPLATES[category]
        else:
            advisories = LOCAL_ADVISORY_TEMPLATES[category]
            
        payload = {
            "city": city.lower(),
            "zone": zone,
            "generated_at": datetime.utcnow(),
            "aqi_level": round(avg_aqi, 0),
            "category": category,
            "advisories": advisories
        }
        
        res = await db_helper.citizen_advisories.insert_one(payload)
        payload["_id"] = str(res.inserted_id)
        
        return payload

    async def _generate_gemini_advisory(self, city: str, zone: str, aqi: float, category: str, pollutants: List[str]) -> Dict[str, Any]:
        """
        Use Gemini 1.5 Flash to generate localized, multi-language health advisories in JSON.
        """
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        You are an advanced air quality health advisory system for Indian cities.
        
        Current conditions:
        - City: {city}
        - Zone: {zone}
        - AQI: {aqi:.0f} ({category})
        - Primary pollutants: {', '.join(pollutants)}
        
        Generate health advisories for these target groups:
        1. "general": General public
        2. "vulnerable": Vulnerable populations (elderly, children, lung/heart patients)
        3. "outdoor_workers": Outdoor workers (construction, street vendors, delivery agents, traffic police)
        
        Generate each advisory in these 6 languages:
        - "en": English
        - "hi": Hindi (हिंदी)
        - "ta": Tamil (தமிழ்)
        - "kn": Kannada (ಕನ್ನಡ)
        - "bn": Bengali (বাংলা)
        - "te": Telugu (తెలుగు)
        
        Instructions:
        - Keep each advisory extremely concise (under 2 short sentences).
        - Be specific, actionable, and culturally relevant to India (e.g. mention masks, shading, air purifiers as appropriate).
        - Return ONLY a valid JSON object matching this structure:
        {{
            "general": {{
                "en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."
            }},
            "vulnerable": {{
                "en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."
            }},
            "outdoor_workers": {{
                "en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."
            }}
        }}
        Do not include markdown tags, code blocks, or triple backticks in your output. Just output the raw JSON string.
        """
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()
        
        # Clean up any potential markdown wraps
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        return json.loads(text)

    async def get_vulnerability_map_data(self, city: str) -> List[Dict[str, Any]]:
        """
        Return location coordinates for schools, hospitals, and outdoor work zones
        in a city to overlay on the pollution maps.
        """
        # Static mock catalog matching actual geography in these cities
        catalog = {
            "delhi": [
                {"name": "Max Super Speciality Hospital", "type": "Hospital", "lat": 28.6425, "lon": 77.2990},
                {"name": "Fortis Hospital, Shalimar Bagh", "type": "Hospital", "lat": 28.7180, "lon": 77.1610},
                {"name": "Delhi Public School, R.K. Puram", "type": "School", "lat": 28.5682, "lon": 77.1810},
                {"name": "Modern School, Barakhamba Road", "type": "School", "lat": 28.6295, "lon": 77.2280},
                {"name": "Anand Vihar Construction Corridor", "type": "Construction Zone", "lat": 28.6480, "lon": 77.3190},
                {"name": "Central Secretariat Metro Construction", "type": "Construction Zone", "lat": 28.6150, "lon": 77.2120}
            ],
            "mumbai": [
                {"name": "KEM Hospital, Parel", "type": "Hospital", "lat": 19.0028, "lon": 72.8423},
                {"name": "Lilavati Hospital, Bandra", "type": "Hospital", "lat": 19.0515, "lon": 72.8282},
                {"name": "Cathedral & John Connon School", "type": "School", "lat": 18.9317, "lon": 72.8335},
                {"name": "Dhirubhai Ambani International School", "type": "School", "lat": 19.0645, "lon": 72.8660},
                {"name": "Coastal Road Construction Site", "type": "Construction Zone", "lat": 18.9950, "lon": 72.8080},
                {"name": "Metro Line 3 SEEPZ Site", "type": "Construction Zone", "lat": 19.1220, "lon": 72.8750}
            ],
            "bengaluru": [
                {"name": "Narayana Health City", "type": "Hospital", "lat": 12.8122, "lon": 77.6935},
                {"name": "Manipal Hospital, Old Airport Road", "type": "Hospital", "lat": 12.9592, "lon": 77.6443},
                {"name": "Bishop Cotton Boys' School", "type": "School", "lat": 12.9702, "lon": 77.5995},
                {"name": "National Public School, Indiranagar", "type": "School", "lat": 12.9735, "lon": 77.6402},
                {"name": "Silk Board Flyover & Metro Junction", "type": "Construction Zone", "lat": 12.9180, "lon": 77.6250},
                {"name": "Outer Ring Road Metro Corridor", "type": "Construction Zone", "lat": 12.9350, "lon": 77.6850}
            ],
        }
        
        if city.lower() not in catalog:
            # Fallback mock generators
            coords = CITIES_COORDS.get(city.lower(), {"lat": 20.0, "lon": 78.0})
            return [
                {"name": f"{city.capitalize()} City Hospital", "type": "Hospital", "lat": coords["lat"] + 0.015, "lon": coords["lon"] - 0.01},
                {"name": f"{city.capitalize()} Public School", "type": "School", "lat": coords["lat"] - 0.02, "lon": coords["lon"] + 0.015},
                {"name": f"Metro Construction Corridor", "type": "Construction Zone", "lat": coords["lat"] + 0.01, "lon": coords["lon"] + 0.01}
            ]
            
        return catalog[city.lower()]

advisory_service = AdvisoryService()
