import React, { useState, useRef, useEffect } from 'react'
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk'
import './Home.css'

const Home: React.FC = () => {
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [textInput, setTextInput] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('中文')
  const [targetLanguage, setTargetLanguage] = useState('英语')
  const [voiceType, setVoiceType] = useState('火锅')

  // 语音转换状态
  const [isRecording, setIsRecording] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [status, setStatus] = useState('就绪')

  // Speech SDK 相关状态
  const [recognizedText, setRecognizedText] = useState('')
  
  // WebSocket 和音频相关引用
  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Speech SDK 相关引用
  const recognizerRef = useRef<speechsdk.TranslationRecognizer | null>(null)
  const synthesizerRef = useRef<speechsdk.SpeechSynthesizer | null>(null)
  const speechConfigRef = useRef<speechsdk.SpeechConfig | null>(null)
  
  // 使用新的认知服务配置
  const region = 'westeurope'
  const key = 'C4w7owYrsgOu2ta7iOwDfNui4x95Rg0m80a0rpE39QTOuMcCKg70JQQJ99BCAC5RqLJXJ3w3AAAYACOGy4xL'
  
  // 在组件中添加语言映射对象，帮助管理众多语言
  const languageMap: Record<string, string> = {
    '英语': 'en-US',
    '中文(简体)': 'zh-CN',
    '中文(繁体)': 'zh-TW',
    '日语': 'ja-JP',
    '韩语': 'ko-KR',
    '法语': 'fr-FR',
    '德语': 'de-DE',
    '西班牙语': 'es-ES',
    '俄语': 'ru-RU',
    '阿拉伯语': 'ar-AE',
    '意大利语': 'it-IT',
    '葡萄牙语': 'pt-BR',
    '葡萄牙语(葡萄牙)': 'pt-PT',
    '荷兰语': 'nl-NL',
    '希腊语': 'el-GR',
    '瑞典语': 'sv-SE',
    '土耳其语': 'tr-TR',
    '泰语': 'th-TH',
    '越南语': 'vi-VN',
    '波兰语': 'pl-PL',
    '印地语': 'hi-IN',
    '芬兰语': 'fi-FI',
    '挪威语': 'nb-NO',
    '丹麦语': 'da-DK',
    '捷克语': 'cs-CZ',
    '印尼语': 'id-ID',
    '罗马尼亚语': 'ro-RO',
    '匈牙利语': 'hu-HU',
    'zh-HK': 'zh-HK',
    'zh-TW': 'zh-TW',
    'en-US': 'en-US',
    'ja-JP': 'ja-JP',
    'ko-KR': 'ko-KR',
    'vi-VN': 'vi-VN',
    'th-TH': 'th-TH',
    'id-ID': 'id-ID',
    'hi-IN': 'hi-IN'
  };
  
  // 首先定义讲述人和风格的类型和映射

  // 定义各语言的讲述人
  const speakersMap: Record<string, {name: string, value: string, styles?: string[]}[]> = {
    'zh-CN': [
      { name: '晓晓 (女)', value: 'zh-CN-XiaoxiaoNeural', styles: ['通用', '亲切', '生气', '助手', '平静', '聊天', '聊天-休闲', '愉快', '客服', '不满', '兴奋', '恐惧', '友好', '柔和', '抒情', '新闻', '诗歌朗读', '悲伤', '严肃', '歉意', '低语'] },
      { name: '晓伊 (女)', value: 'zh-CN-XiaoyiNeural', styles: ['通用', '亲切', '生气', '愉快', '不满', '尴尬', '恐惧', '柔和', '悲伤', '严肃'] },
      { name: '晓甄 (女)', value: 'zh-CN-XiaozhenNeural', styles: ['通用', '生气', '愉快', '不满', '恐惧', '悲伤', '严肃'] },
      { name: '晓辰 (女)', value: 'zh-CN-XiaochenNeural', styles: ['通用', '直播带货'] },
      { name: '晓涵 (女)', value: 'zh-CN-XiaohanNeural', styles: ['通用', '亲切', '生气', '平静', '愉快', '不满', '尴尬', '恐惧', '柔和', '悲伤', '严肃'] },
      { name: '晓梦 (女)', value: 'zh-CN-XiaomengNeural', styles: ['通用', '聊天'] },
      { name: '晓墨 (女)', value: 'zh-CN-XiaomoNeural', styles: ['通用', '亲切', '生气', '平静', '愉快', '沮丧', '不满', '尴尬', '嫉妒', '恐惧', '柔和', '悲伤', '严肃'] },
      { name: '晓瑞 (女)', value: 'zh-CN-XiaoruiNeural', styles: ['通用', '生气', '平静', '恐惧', '悲伤'] },
      { name: '晓双 (女童)', value: 'zh-CN-XiaoshuangNeural', styles: ['通用', '聊天'] },
      { name: '晓颜 (女)', value: 'zh-CN-XiaoyanNeural', styles: ['通用'] },
      { name: '晓悠 (女童)', value: 'zh-CN-XiaoyouNeural', styles: ['通用'] },
      { name: '晓臻 (女)', value: 'zh-CN-XiaozhenNeural', styles: ['通用', '生气', '愉快', '不满', '恐惧', '悲伤', '严肃'] },
      { name: '云希 (男)', value: 'zh-CN-YunxiNeural', styles: ['通用', '生气', '助手', '聊天', '愉快', '沮丧', '不满', '尴尬', '恐惧', '叙事-放松', '新闻播报', '悲伤', '严肃'] },
      { name: '云枫 (男)', value: 'zh-CN-YunfengNeural', styles: ['通用', '生气', '愉快', '沮丧', '不满', '恐惧', '悲伤', '严肃'] },
      { name: '云皓 (男)', value: 'zh-CN-YunhaoNeural', styles: ['通用', '广告-欢快'] },
      { name: '云健 (男)', value: 'zh-CN-YunjianNeural', styles: ['通用', '生气', '愉快', '沮丧', '不满', '纪录片叙述', '叙事-放松', '悲伤', '严肃', '体育解说', '体育解说-激动'] },
      { name: '云夏 (男)', value: 'zh-CN-YunxiaNeural', styles: ['通用', '生气', '平静', '愉快', '恐惧', '悲伤'] },
      { name: '云扬 (男)', value: 'zh-CN-YunyangNeural', styles: ['通用', '客服', '叙事-专业', '新闻播报-休闲'] },
      { name: '云野 (男)', value: 'zh-CN-YunyeNeural', styles: ['通用', '生气', '平静', '愉快', '不满', '尴尬', '恐惧', '悲伤', '严肃'] },
      { name: '云泽 (男)', value: 'zh-CN-YunzeNeural', styles: ['通用', '生气', '平静', '愉快', '沮丧', '不满', '纪录片叙述', '恐惧', '悲伤', '严肃'] }
    ],
    'zh-TW': [
      { name: '曉臻 (女)', value: 'zh-TW-HsiaoChenNeural', styles: ['通用'] },
      { name: '曉雨 (女)', value: 'zh-TW-HsiaoYuNeural', styles: ['通用'] },
      { name: '曉婷 (女)', value: 'zh-TW-HsiaoTingNeural', styles: ['通用'] },
      { name: '雲哲 (男)', value: 'zh-TW-YunJheNeural', styles: ['通用'] },
      { name: '正文 (男)', value: 'zh-TW-ZhengWenNeural', styles: ['通用'] },
      { name: '峻賢 (男)', value: 'zh-TW-ShyunJianNeural', styles: ['通用'] }
    ],
    'en-US': [
      { name: 'Jenny (女)', value: 'en-US-JennyNeural', styles: ['通用', '生气', '悲伤', '害羞', '客服'] },
      { name: 'Aria (女)', value: 'en-US-AriaNeural', styles: ['通用', '生气', '聊天', '客服', '同情', '兴奋', '友好', '希望', '叙事', '新闻-休闲', '新闻-正式', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Jane (女)', value: 'en-US-JaneNeural', styles: ['通用', '生气', '聊天', '兴奋', '友好', '希望', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Nancy (女)', value: 'en-US-NancyNeural', styles: ['通用', '生气', '聊天', '兴奋', '友好', '希望', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Sarah (女)', value: 'en-US-SarahNeural', styles: ['通用', '聊天', '同情', '幽默'] },
      { name: 'Michelle (女)', value: 'en-US-MichelleNeural', styles: ['通用', '聊天', '同情'] },
      { name: 'Ana (女)', value: 'en-US-AnaNeural', styles: ['通用', '聊天', '同情'] },
      { name: 'Clara (女)', value: 'en-US-ClaraNeural', styles: ['通用', '聊天', '幽默'] },
      { name: 'Guy (男)', value: 'en-US-GuyNeural', styles: ['通用', '生气', '悲伤', '害羞'] },
      { name: 'Davis (男)', value: 'en-US-DavisNeural', styles: ['通用', '生气', '聊天', '兴奋', '友好', '希望', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Tony (男)', value: 'en-US-TonyNeural', styles: ['通用', '生气', '聊天', '兴奋', '友好', '希望', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Jason (男)', value: 'en-US-JasonNeural', styles: ['通用', '生气', '聊天', '兴奋', '友好', '希望', '悲伤', '喊叫', '恐惧', '不友好', '低语'] },
      { name: 'Andrew (男)', value: 'en-US-AndrewNeural', styles: ['通用', '同情', '希望'] },
      { name: 'Brandon (男)', value: 'en-US-BrandonNeural', styles: ['通用', '聊天', '幽默'] },
      { name: 'Christopher (男)', value: 'en-US-ChristopherNeural', styles: ['通用', '聊天'] },
      { name: 'Eric (男)', value: 'en-US-EricNeural', styles: ['通用', '聊天'] }
    ],
    'ja-JP': [
      { name: 'Nanami (女)', value: 'ja-JP-NanamiNeural', styles: ['通用', '聊天', '愉快', '客服'] },
      { name: 'Keita (男)', value: 'ja-JP-KeitaNeural', styles: ['通用'] },
      { name: 'Aoi (女)', value: 'ja-JP-AoiNeural', styles: ['通用'] },
      { name: 'Daichi (男)', value: 'ja-JP-DaichiNeural', styles: ['通用'] },
      { name: 'Mayu (女)', value: 'ja-JP-MayuNeural', styles: ['通用'] },
      { name: 'Naoki (男)', value: 'ja-JP-NaokiNeural', styles: ['通用'] },
      { name: 'Shiori (女)', value: 'ja-JP-ShioriNeural', styles: ['通用'] }
    ],
    'ko-KR': [
      { name: 'SunHi (女)', value: 'ko-KR-SunHiNeural', styles: ['通用'] },
      { name: 'JiMin (女)', value: 'ko-KR-JiMinNeural', styles: ['通用'] },
      { name: 'SeoHyeon (女)', value: 'ko-KR-SeoHyeonNeural', styles: ['通用'] },
      { name: 'YuJin (女)', value: 'ko-KR-YuJinNeural', styles: ['通用'] },
      { name: 'InJoon (男)', value: 'ko-KR-InJoonNeural', styles: ['通用', '悲伤'] },
      { name: 'GookMin (男)', value: 'ko-KR-GookMinNeural', styles: ['通用'] }
    ],
    'zh-HK': [
      { name: '曉曼 (女)', value: 'zh-HK-HiuMaanNeural', styles: ['通用'] },
      { name: '曉盈 (女)', value: 'zh-HK-HiuGaaiNeural', styles: ['通用'] },
      { name: '雲龍 (男)', value: 'zh-HK-WanLungNeural', styles: ['通用'] }
    ],
    'vi-VN': [
      { name: 'Hoài (女)', value: 'vi-VN-HoaiMyNeural', styles: ['通用'] },
      { name: 'Nam (男)', value: 'vi-VN-NamMinhNeural', styles: ['通用'] }
    ],
    'th-TH': [
      { name: 'Achara (女)', value: 'th-TH-AcharaNeural', styles: ['通用'] },
      { name: 'Premwadee (女)', value: 'th-TH-PremwadeeNeural', styles: ['通用'] },
      { name: 'Niwat (男)', value: 'th-TH-NiwatNeural', styles: ['通用'] }
    ],
    'id-ID': [
      { name: 'Gadis (女)', value: 'id-ID-GadisNeural', styles: ['通用'] },
      { name: 'Ardi (男)', value: 'id-ID-ArdiNeural', styles: ['通用'] }
    ],
    'hi-IN': [
      { name: 'Swara (女)', value: 'hi-IN-SwaraNeural', styles: ['通用', '同情', '新闻'] },
      { name: 'Madhur (男)', value: 'hi-IN-MadhurNeural', styles: ['通用'] }
    ],
    'de-DE': [
      { name: 'Katja (女)', value: 'de-DE-KatjaNeural', styles: ['通用'] },
      { name: 'Amala (女)', value: 'de-DE-AmalaNeural', styles: ['通用', '聊天'] },
      { name: 'Elke (女)', value: 'de-DE-ElkeNeural', styles: ['通用', '聊天'] },
      { name: 'Gisela (女)', value: 'de-DE-GiselaNeural', styles: ['通用', '聊天'] },
      { name: 'Klarissa (女)', value: 'de-DE-KlarissaNeural', styles: ['通用', '聊天'] },
      { name: 'Louisa (女)', value: 'de-DE-LouisaNeural', styles: ['通用', '聊天'] },
      { name: 'Maja (女)', value: 'de-DE-MajaNeural', styles: ['通用', '聊天'] },
      { name: 'Tanja (女)', value: 'de-DE-TanjaNeural', styles: ['通用', '聊天'] },
      { name: 'Conrad (男)', value: 'de-DE-ConradNeural', styles: ['通用', '欢快', '悲伤'] },
      { name: 'Bernd (男)', value: 'de-DE-BerndNeural', styles: ['通用', '聊天'] },
      { name: 'Christoph (男)', value: 'de-DE-ChristophNeural', styles: ['通用', '聊天'] },
      { name: 'Kasper (男)', value: 'de-DE-KasperNeural', styles: ['通用', '聊天'] },
      { name: 'Killian (男)', value: 'de-DE-KillianNeural', styles: ['通用', '聊天'] },
      { name: 'Klaus (男)', value: 'de-DE-KlausNeural', styles: ['通用', '聊天'] },
      { name: 'Ralf (男)', value: 'de-DE-RalfNeural', styles: ['通用', '聊天'] }
    ],
    'fr-FR': [
      { name: 'Denise (女)', value: 'fr-FR-DeniseNeural', styles: ['通用', '欢快', '兴奋', '悲伤', '低语'] },
      { name: 'Eloise (女)', value: 'fr-FR-EloiseNeural', styles: ['通用', '聊天'] },
      { name: 'Emmanuelle (女)', value: 'fr-FR-EmmanuelleNeural', styles: ['通用', '聊天'] },
      { name: 'Jacqueline (女)', value: 'fr-FR-JacquelineNeural', styles: ['通用', '聊天'] },
      { name: 'Josephine (女)', value: 'fr-FR-JosephineNeural', styles: ['通用', '聊天'] },
      { name: 'Yvette (女)', value: 'fr-FR-YvetteNeural', styles: ['通用', '聊天'] },
      { name: 'Henri (男)', value: 'fr-FR-HenriNeural', styles: ['通用', '欢快', '兴奋', '悲伤', '低语'] },
      { name: 'Alain (男)', value: 'fr-FR-AlainNeural', styles: ['通用', '聊天'] },
      { name: 'Claude (男)', value: 'fr-FR-ClaudeNeural', styles: ['通用', '聊天'] },
      { name: 'Jean (男)', value: 'fr-FR-JeanNeural', styles: ['通用', '聊天'] },
      { name: 'Maurice (男)', value: 'fr-FR-MauriceNeural', styles: ['通用', '聊天'] },
      { name: 'Yves (男)', value: 'fr-FR-YvesNeural', styles: ['通用', '聊天'] }
    ],
    'es-ES': [
      { name: 'Elvira (女)', value: 'es-ES-ElviraNeural', styles: ['通用', '聊天'] },
      { name: 'Alicia (女)', value: 'es-ES-AliciaNeural', styles: ['通用', '聊天'] },
      { name: 'Esther (女)', value: 'es-ES-EstherNeural', styles: ['通用', '聊天'] },
      { name: 'Irene (女)', value: 'es-ES-IreneNeural', styles: ['通用', '聊天'] },
      { name: 'Lourdes (女)', value: 'es-ES-LourdesNeural', styles: ['通用', '聊天'] },
      { name: 'Teresa (女)', value: 'es-ES-TeresaNeural', styles: ['通用', '聊天'] },
      { name: 'Alvaro (男)', value: 'es-ES-AlvaroNeural', styles: ['通用', '欢快', '悲伤'] },
      { name: 'Arnau (男)', value: 'es-ES-ArnauNeural', styles: ['通用', '聊天'] },
      { name: 'Dario (男)', value: 'es-ES-DarioNeural', styles: ['通用', '聊天'] },
      { name: 'Elia (男)', value: 'es-ES-EliaNeural', styles: ['通用', '聊天'] },
      { name: 'Gael (男)', value: 'es-ES-GaelNeural', styles: ['通用', '聊天'] },
      { name: 'Sergio (男)', value: 'es-ES-SergioNeural', styles: ['通用', '聊天'] }
    ],
    'it-IT': [
      { name: 'Isabella (女)', value: 'it-IT-IsabellaNeural', styles: ['通用', '聊天', '欢快', '兴奋', '悲伤', '低语'] },
      { name: 'Elsa (女)', value: 'it-IT-ElsaNeural', styles: ['通用', '聊天'] },
      { name: 'Federica (女)', value: 'it-IT-FedericaNeural', styles: ['通用', '聊天'] },
      { name: 'Francesca (女)', value: 'it-IT-FrancescaNeural', styles: ['通用', '聊天'] },
      { name: 'Gianna (女)', value: 'it-IT-GiannaNeural', styles: ['通用', '聊天'] },
      { name: 'Lisa (女)', value: 'it-IT-LisaNeural', styles: ['通用', '聊天'] },
      { name: 'Diego (男)', value: 'it-IT-DiegoNeural', styles: ['通用', '欢快', '兴奋', '悲伤'] },
      { name: 'Benigno (男)', value: 'it-IT-BenignoNeural', styles: ['通用', '聊天'] },
      { name: 'Calimero (男)', value: 'it-IT-CalimeroNeural', styles: ['通用', '聊天'] },
      { name: 'Cataldo (男)', value: 'it-IT-CataldoNeural', styles: ['通用', '聊天'] },
      { name: 'Gianni (男)', value: 'it-IT-GianniNeural', styles: ['通用', '聊天'] },
      { name: 'Rinaldo (男)', value: 'it-IT-RinaldoNeural', styles: ['通用', '聊天'] }
    ],
    'ru-RU': [
      { name: 'Svetlana (女)', value: 'ru-RU-SvetlanaNeural', styles: ['通用'] },
      { name: 'Dariya (女)', value: 'ru-RU-DariyaNeural', styles: ['通用'] },
      { name: 'Marina (女)', value: 'ru-RU-MarinaNeural', styles: ['通用'] },
      { name: 'Irina (女)', value: 'ru-RU-IrinaNeural', styles: ['通用'] },
      { name: 'Ekaterina (女)', value: 'ru-RU-EkaterinaNeural', styles: ['通用'] },
      { name: 'Dmitry (男)', value: 'ru-RU-DmitryNeural', styles: ['通用'] },
      { name: 'Pavel (男)', value: 'ru-RU-PavelNeural', styles: ['通用'] },
      { name: 'Ivan (男)', value: 'ru-RU-IvanNeural', styles: ['通用'] },
      { name: 'Alexey (男)', value: 'ru-RU-AlexeyNeural', styles: ['通用'] },
      { name: 'Sergey (男)', value: 'ru-RU-SergeyNeural', styles: ['通用'] }
    ],
    'pt-BR': [
      { name: 'Francisca (女)', value: 'pt-BR-FranciscaNeural', styles: ['通用'] },
      { name: 'Giovanna (女)', value: 'pt-BR-GiovannaNeural', styles: ['通用'] },
      { name: 'Brenda (女)', value: 'pt-BR-BrendaNeural', styles: ['通用'] },
      { name: 'Leila (女)', value: 'pt-BR-LeilaNeural', styles: ['通用'] },
      { name: 'Leticia (女)', value: 'pt-BR-LeticiaNeural', styles: ['通用'] },
      { name: 'Antonio (男)', value: 'pt-BR-AntonioNeural', styles: ['通用'] },
      { name: 'Daniel (男)', value: 'pt-BR-DanielNeural', styles: ['通用'] },
      { name: 'Fabio (男)', value: 'pt-BR-FabioNeural', styles: ['通用'] },
      { name: 'Humberto (男)', value: 'pt-BR-HumbertoNeural', styles: ['通用'] },
      { name: 'Julio (男)', value: 'pt-BR-JulioNeural', styles: ['通用'] }
    ],
    'ar-AE': [
      { name: 'Fatima (女)', value: 'ar-AE-FatimaNeural', styles: ['通用'] },
      { name: 'Hamdan (男)', value: 'ar-AE-HamdanNeural', styles: ['通用'] }
    ],
    'nl-NL': [
      { name: 'Colette (女)', value: 'nl-NL-ColetteNeural', styles: ['通用'] },
      { name: 'Fenna (女)', value: 'nl-NL-FennaNeural', styles: ['通用'] },
      { name: 'Maarten (男)', value: 'nl-NL-MaartenNeural', styles: ['通用'] }
    ],
    'pl-PL': [
      { name: 'Zofia (女)', value: 'pl-PL-ZofiaNeural', styles: ['通用'] },
      { name: 'Marek (男)', value: 'pl-PL-MarekNeural', styles: ['通用'] }
    ],
    'sv-SE': [
      { name: 'Sofie (女)', value: 'sv-SE-SofieNeural', styles: ['通用'] },
      { name: 'Hillevi (女)', value: 'sv-SE-HilleviNeural', styles: ['通用'] },
      { name: 'Mattias (男)', value: 'sv-SE-MattiasNeural', styles: ['通用'] }
    ],
    'tr-TR': [
      { name: 'Emel (女)', value: 'tr-TR-EmelNeural', styles: ['通用'] },
      { name: 'Ahmet (男)', value: 'tr-TR-AhmetNeural', styles: ['通用'] }
    ],
    'nb-NO': [
      { name: 'Iselin (女)', value: 'nb-NO-IselinNeural', styles: ['通用'] },
      { name: 'Pernille (女)', value: 'nb-NO-PernilleNeural', styles: ['通用'] },
      { name: 'Finn (男)', value: 'nb-NO-FinnNeural', styles: ['通用'] }
    ],
    'fi-FI': [
      { name: 'Noora (女)', value: 'fi-FI-NooraNeural', styles: ['通用'] },
      { name: 'Selma (女)', value: 'fi-FI-SelmaNeural', styles: ['通用'] },
      { name: 'Harri (男)', value: 'fi-FI-HarriNeural', styles: ['通用'] }
    ],
    'cs-CZ': [
      { name: 'Vlasta (女)', value: 'cs-CZ-VlastaNeural', styles: ['通用'] },
      { name: 'Antonin (男)', value: 'cs-CZ-AntoninNeural', styles: ['通用'] }
    ],
    'da-DK': [
      { name: 'Christel (女)', value: 'da-DK-ChristelNeural', styles: ['通用'] },
      { name: 'Jeppe (男)', value: 'da-DK-JeppeNeural', styles: ['通用'] }
    ],
    'el-GR': [
      { name: 'Athina (女)', value: 'el-GR-AthinaNeural', styles: ['通用'] },
      { name: 'Nestoras (男)', value: 'el-GR-NestorasNeural', styles: ['通用'] }
    ],
    'hu-HU': [
      { name: 'Noemi (女)', value: 'hu-HU-NoemiNeural', styles: ['通用'] },
      { name: 'Tamas (男)', value: 'hu-HU-TamasNeural', styles: ['通用'] }
    ],
    'ro-RO': [
      { name: 'Alina (女)', value: 'ro-RO-AlinaNeural', styles: ['通用'] },
      { name: 'Emil (男)', value: 'ro-RO-EmilNeural', styles: ['通用'] }
    ],
    'pt-PT': [
      { name: 'Raquel (女)', value: 'pt-PT-RaquelNeural', styles: ['通用'] },
      { name: 'Duarte (男)', value: 'pt-PT-DuarteNeural', styles: ['通用'] }
    ]
  };
  
  // 定义风格映射
  const styleMap: Record<string, string> = {
    '通用': 'general',
    '亲切': 'affectionate',
    '温暖': 'affectionate',
    '生气': 'angry',
    '助手': 'assistant',
    '平静': 'calm',
    '悲伤': 'sad',
    '兴奋': 'excited',
    '害羞': 'embarrassed',
    '尴尬': 'embarrassed',
    '恐惧': 'fearful',
    '惊恐': 'terrified',
    '沮丧': 'depressed',
    '不满': 'disgruntled',
    '嫉妒': 'envious',
    '客服': 'customerservice',
    '柔和': 'gentle',
    '新闻': 'newscast',
    '新闻播报': 'newscast',
    '抒情': 'lyrical',
    '幽默': 'humorous',
    '同情': 'empathetic',
    '叙事': 'narration-professional',
    '叙事-专业': 'narration-professional',
    '叙事-放松': 'narration-relaxed',
    '纪录片叙述': 'documentary-narration',
    '体育解说': 'sports-commentary',
    '体育解说-激动': 'sports-commentary-excited',
    '广告-欢快': 'advertisement-upbeat',
    '直播带货': 'livecommercial',
    '诗歌朗读': 'poetry-reading',
    '聊天': 'chat',
    '聊天-休闲': 'chat-casual',
    '愉快': 'cheerful',
    '友好': 'friendly',
    '不友好': 'unfriendly',
    '喊叫': 'shouting',
    '希望': 'hopeful',
    '低语': 'whispering',
    '新闻播报-休闲': 'newscast-casual',
    '新闻-正式': 'newscast-formal',
    '严肃': 'serious',
    '歉意': 'sorry'
  };

  // 在组件中添加新的状态
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('通用');
  const [availableSpeakers, setAvailableSpeakers] = useState<{name: string, value: string, styles?: string[]}[]>([]);
  const [availableStyles, setAvailableStyles] = useState<string[]>(['通用']);
  
  // 添加上次识别的时间戳状态
  const [lastRecognitionTimestamp, setLastRecognitionTimestamp] = useState<number>(0);
  
  // 添加停顿阈值状态，默认10秒
  const [pauseThreshold, setPauseThreshold] = useState<number>(10);
  
  // PAUSE_THRESHOLD变量移动到useEffect中
  const [PAUSE_THRESHOLD, setPAUSE_THRESHOLD] = useState<number>(10000);
  
  // 添加一个变量来跟踪上次朗读的文本
  const lastSpokenTextRef = useRef<string>('');
  
  // 初始化语音服务配置
  const initSpeechServices = () => {
    try {
      // 创建语音配置
      const speechConfig = speechsdk.SpeechConfig.fromSubscription(key, region);
      
      // 设置语音源语言
      let fromLanguage = 'zh-CN'; // 默认中文
      if (sourceLanguage === '英语') {
        fromLanguage = 'en-US';
      } else if (sourceLanguage === '日语') {
        fromLanguage = 'ja-JP';
      }
      
      // 设置翻译目标语言 - 使用映射获取对应的语言代码
      const toLanguage = languageMap[targetLanguage] || 'en-US';
      
      // 设置源语言和目标语言
      speechConfig.speechRecognitionLanguage = fromLanguage;
      
      // 设置语音合成语言和声音
      if (selectedSpeaker) {
        speechConfig.speechSynthesisVoiceName = selectedSpeaker;
        
        // 设置语音风格
        if (selectedStyle && selectedStyle !== '通用') {
          const styleValue = styleMap[selectedStyle] || 'general';
          const langCode = languageMap[targetLanguage] || 'en-US';
          const ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${langCode}">
            <voice name="${selectedSpeaker}">
              <mstts:express-as style="${styleValue}">
                ${translatedText}
              </mstts:express-as>
            </voice>
          </speak>`;
          
          const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
          synthesizerRef.current = synthesizer;
          
          synthesizerRef.current.speakSsmlAsync(
            ssmlText,
            result => {
              if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                console.log('朗读完成');
                setStatus('朗读已完成');
                
                // 如果之前在录音，则恢复识别
                if (isRecording) {
                  setTimeout(() => {
                    if (isRecording) {
                      console.log('恢复识别');
                      initSpeechServices();
                      if (recognizerRef.current) {
                        try {
                          recognizerRef.current.startContinuousRecognitionAsync();
                          console.log('成功恢复识别');
                        } catch (error) {
                          console.error('恢复识别失败:', error);
                        }
                      }
                    }
                  }, 500); // 延迟一点恢复识别，避免可能的回声
                }
              } else {
                console.error('语音合成错误:', result.errorDetails);
                setStatus('朗读出错');
              }
            },
            error => {
              console.error('语音合成错误:', error);
              setStatus('朗读出错');
              
              // 如果之前在录音，则恢复识别
              if (isRecording && recognizerRef.current) {
                initSpeechServices();
                try {
                  recognizerRef.current.startContinuousRecognitionAsync();
                  console.log('成功恢复识别');
                } catch (error) {
                  console.error('恢复识别失败:', error);
                }
              }
            }
          );
        }
      } else {
        // 如果没有选定讲述人，则使用默认讲述人
        const languageCode = languageMap[targetLanguage] || 'en-US';
        const speakers = speakersMap[languageCode] || [];
        if (speakers.length > 0) {
          const defaultSpeaker = gender === 'female' ? 
            speakers.find(s => s.name.includes('女'))?.value || speakers[0].value : 
            speakers.find(s => s.name.includes('男'))?.value || speakers[0].value;
          speechConfig.speechSynthesisVoiceName = defaultSpeaker;
        }
      }
      
      // 启用音频日志记录和调试
      speechConfig.setProperty("Speech_LogFilename", "translationLogs.txt");
      speechConfig.setProperty("SpeechServiceConnection_EnableAudioLogging", "true");
      
      // 回声消除和降噪设置
      speechConfig.setProperty("echo-cancellation", "true");
      speechConfig.setProperty("AUDIO-CONFIG-ENABLE-ECHO-CANCELLATION", "true");
      speechConfig.setProperty("noise-suppression", "high");
      speechConfig.setProperty("AUDIO-CONFIG-ENABLE-NOISE-SUPPRESSION", "true");
      
      // 增强语音检测
      speechConfig.setProperty("SpeechServiceConnection_EndSilenceTimeoutMs", "1000");
      speechConfig.setProperty("segmentation-silence-timeout-ms", "500");
      
      speechConfigRef.current = speechConfig;
      
      // 创建翻译配置
      const translationConfig = speechsdk.SpeechTranslationConfig.fromSubscription(key, region);
      translationConfig.speechRecognitionLanguage = fromLanguage;
      
      // 使用简化的目标语言代码，如'en', 'zh', 'fr', 'de'等
      // 因为翻译服务需要简化的语言代码而非完整的locale
      const simplifiedToLanguage = toLanguage.split('-')[0]; // 如从'en-US'提取'en'
      translationConfig.addTargetLanguage(simplifiedToLanguage);
      
      // 检查是否是中文到中文的翻译
      const isChineseToChineseTranslation = 
        (fromLanguage.startsWith('zh') && toLanguage.startsWith('zh')) ||
        (sourceLanguage === '中文' && (targetLanguage === '中文' || targetLanguage === '中文(简体)'));
      
      // 如果是中文到中文的翻译，添加英语作为中间语言
      if (isChineseToChineseTranslation) {
        console.log("检测到中文到中文转换，添加英语作为中间语言");
        // 添加英语作为额外的目标语言，确保服务能正常工作
        translationConfig.addTargetLanguage("en");
      }
      
      // 对翻译配置也应用相同的增强设置
      translationConfig.setProperty("SpeechServiceConnection_EndSilenceTimeoutMs", "1000");
      translationConfig.setProperty("segmentation-silence-timeout-ms", "500");
      translationConfig.setProperty("echo-cancellation", "true");
      translationConfig.setProperty("noise-suppression", "high");
      
      // 设置音频配置
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // 创建语音翻译识别器
      const translator = new speechsdk.TranslationRecognizer(translationConfig, audioConfig);
      
      // 处理识别结果事件
      translator.recognized = (s, e) => {
        if (e.result.reason === speechsdk.ResultReason.TranslatedSpeech) {
          const originalText = e.result.text;
          // 使用简化的目标语言代码获取翻译结果
          const simplifiedToLanguage = toLanguage.split('-')[0]; // 如从'en-US'提取'en'
          let translation = e.result.translations.get(simplifiedToLanguage);
          
          console.log(`RECOGNIZED in '${fromLanguage}': Text=${originalText}`);
          console.log(`TRANSLATED into '${toLanguage}' (${simplifiedToLanguage}): ${translation}`);
          
          // 记录当前时间戳并计算自上次识别以来的时间
          const currentTime = new Date().getTime();
          const timeSinceLastRecognition = currentTime - lastRecognitionTimestamp;
          
          // 记录详细的时间和阈值日志
          console.log(`Time since last recognition: ${timeSinceLastRecognition}ms, Threshold: ${PAUSE_THRESHOLD}ms`);
          console.log(`Current pauseThreshold setting: ${pauseThreshold} seconds (${PAUSE_THRESHOLD}ms)`);
          
          // 更新上次识别时间戳
          setLastRecognitionTimestamp(currentTime);
          
          // 判断是否追加文本（停顿小于阈值）
          const shouldAppend = timeSinceLastRecognition < PAUSE_THRESHOLD && timeSinceLastRecognition > 0;
          console.log(`Should append text: ${shouldAppend} (${timeSinceLastRecognition}ms < ${PAUSE_THRESHOLD}ms = ${timeSinceLastRecognition < PAUSE_THRESHOLD})`);
          
          // 设置识别的原文，根据是否应该追加决定
          const newRecognizedText = shouldAppend 
            ? `${recognizedText} ${originalText}` 
            : originalText;
            
          console.log(`Setting recognized text to: ${shouldAppend ? 'APPEND' : 'REPLACE'} mode`);
          setRecognizedText(newRecognizedText);
          
          // 处理中文到中文的翻译情况
          if (isChineseToChineseTranslation) {
            console.log("中文到中文翻译：使用原始文本");
            // 追加或替换文本
            const newTranslatedText = shouldAppend ? `${translatedText} ${originalText}` : originalText;
            setTranslatedText(newTranslatedText);
            setTextInput(newTranslatedText);
            
            // 只有当不是追加模式，或者文本显著变化时才朗读
            if (!shouldAppend || originalText.length > 10) {
              speakTranslatedText(newTranslatedText);
            }
          } else if (!translation) {
            // 如果翻译结果为undefined且目标语言与源语言相同，则使用原文作为翻译结果
            if (simplifiedToLanguage === fromLanguage.split('-')[0]) {
              console.log("源语言和目标语言相同，使用原始文本作为翻译结果");
              // 追加或替换文本
              const newTranslatedText = shouldAppend ? `${translatedText} ${originalText}` : originalText;
              setTranslatedText(newTranslatedText);
              setTextInput(newTranslatedText);
              
              // 只有当不是追加模式，或者文本显著变化时才朗读
              if (!shouldAppend || originalText.length > 10) {
                speakTranslatedText(newTranslatedText);
              }
            } else {
              console.log("翻译结果为undefined，但源语言和目标语言不同");
              setStatus("翻译失败，请重试");
            }
          } else {
            // 正常翻译情况
            // 追加或替换文本
            const newTranslatedText = shouldAppend ? `${translatedText} ${translation}` : translation;
            setTranslatedText(newTranslatedText);
            setTextInput(newTranslatedText);
            
            // 只有当不是追加模式，或者文本显著变化时才朗读
            if (!shouldAppend || translation.length > 10) {
              speakTranslatedText(newTranslatedText);
            }
          }
        } else if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          console.log(`RECOGNIZED: Text=${e.result.text}`);
          console.log("Speech not translated.");
          
          // 记录当前时间戳并计算自上次识别以来的时间
          const currentTime = new Date().getTime();
          const timeSinceLastRecognition = currentTime - lastRecognitionTimestamp;
          
          // 记录详细的时间和阈值日志
          console.log(`Time since last recognition: ${timeSinceLastRecognition}ms, Threshold: ${PAUSE_THRESHOLD}ms`);
          console.log(`Current pauseThreshold setting: ${pauseThreshold} seconds (${PAUSE_THRESHOLD}ms)`);
          
          // 更新上次识别时间戳
          setLastRecognitionTimestamp(currentTime);
          
          // 判断是否追加文本（停顿小于阈值）
          const shouldAppend = timeSinceLastRecognition < PAUSE_THRESHOLD && timeSinceLastRecognition > 0;
          console.log(`Should append text: ${shouldAppend} (${timeSinceLastRecognition}ms < ${PAUSE_THRESHOLD}ms = ${timeSinceLastRecognition < PAUSE_THRESHOLD})`);
          
          // 设置识别的文本，根据是否应该追加决定
          const newRecognizedText = shouldAppend 
            ? `${recognizedText} ${e.result.text}` 
            : e.result.text;
            
          console.log(`Setting recognized text to: ${shouldAppend ? 'APPEND' : 'REPLACE'} mode`);
          setRecognizedText(newRecognizedText);
          
          // 如果只有识别没有翻译，保持之前的翻译结果不变
        } else if (e.result.reason === speechsdk.ResultReason.NoMatch) {
          console.log("NOMATCH: Speech could not be recognized.");
          setStatus("无法识别语音");
        }
      };
      
      // 处理识别进度事件
      translator.recognizing = (s, e) => {
        const partialText = e.result.text;
        console.log(`RECOGNIZING: ${partialText}`);
        setStatus(`正在识别: ${partialText}`);
      };
      
      recognizerRef.current = translator;
      
      // 创建语音合成器
      const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
      synthesizerRef.current = synthesizer;
      
      setStatus('语音服务已准备好');
    } catch (error) {
      console.error('初始化语音服务错误:', error);
      setStatus('初始化语音服务错误');
    }
  };
  
  // 扩展朗读翻译后的文本功能，增加智能朗读控制
  const speakTranslatedText = (text: string) => {
    if (!text) return;
    
    try {
      // 如果文本与上次朗读的完全相同，则不重复朗读
      if (text === lastSpokenTextRef.current) {
        console.log('文本未变化，跳过朗读');
        return;
      }
      
      // 检查是否是追加模式，如果是追加模式，只朗读新增部分
      const isAppendMode = text.startsWith(lastSpokenTextRef.current) && lastSpokenTextRef.current.length > 0;
      let textToSpeak = text;
      
      if (isAppendMode) {
        // 只朗读新增的部分
        textToSpeak = text.substring(lastSpokenTextRef.current.length);
        console.log(`追加模式：只朗读新增部分 "${textToSpeak}"`);
        
        // 如果新增部分太短，不进行朗读
        if (textToSpeak.length < 5) {
          console.log('新增部分太短，跳过朗读');
          lastSpokenTextRef.current = text; // 更新上次朗读的文本
          return;
        }
      }
      
      setStatus('正在朗读...');
      lastSpokenTextRef.current = text; // 更新上次朗读的文本
      
      // 如果文本太长，可能需要截断或分段处理
      const maxTextLength = 1000; // 设置最大文本长度
      
      // 如果文本长度超过最大值，只朗读最后部分
      if (textToSpeak.length > maxTextLength) {
        console.log(`Text too long (${textToSpeak.length} chars), truncating to last ${maxTextLength} chars`);
        textToSpeak = textToSpeak.substring(textToSpeak.length - maxTextLength);
      }
      
      // 如果正在录音，先暂停识别以避免回声
      let wasRecording = false;
      if (isRecording && recognizerRef.current) {
        wasRecording = true;
        console.log('暂时暂停识别以避免回声');
        try {
          recognizerRef.current.stopContinuousRecognitionAsync();
          console.log('成功暂停识别');
        } catch (error) {
          console.error('暂停识别失败:', error);
        }
      }
      
      // 创建新的合成器
      const speechConfig = speechsdk.SpeechConfig.fromSubscription(key, region);
      
      // 确保为目标语言选择正确的语音
      const languageCode = languageMap[targetLanguage] || 'en-US';
      console.log(`Using language code for synthesis: ${languageCode}`);
      
      // 如果没有选择讲述人，选择默认讲述人
      if (!selectedSpeaker) {
        const speakers = speakersMap[languageCode] || [];
        if (speakers.length > 0) {
          const defaultSpeaker = gender === 'female' 
            ? speakers.find(s => s.name.includes('女'))?.value || speakers[0].value 
            : speakers.find(s => s.name.includes('男'))?.value || speakers[0].value;
          
          speechConfig.speechSynthesisVoiceName = defaultSpeaker;
          console.log(`Using default speaker: ${defaultSpeaker}`);
        } else {
          // 如果找不到目标语言的讲述人，使用英语作为后备
          speechConfig.speechSynthesisVoiceName = 'en-US-AriaNeural';
          console.log('No speakers found for target language, using English default');
        }
      } else {
        speechConfig.speechSynthesisVoiceName = selectedSpeaker;
        console.log(`Using selected speaker: ${selectedSpeaker}`);
      }
      
      // 如果有选择风格，则使用SSML格式
      if (selectedStyle && selectedStyle !== '通用') {
        const styleValue = styleMap[selectedStyle] || 'general';
        const langCode = languageMap[targetLanguage] || 'en-US';
        const ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${langCode}">
          <voice name="${selectedSpeaker || speechConfig.speechSynthesisVoiceName}">
            <mstts:express-as style="${styleValue}">
              ${textToSpeak}
            </mstts:express-as>
          </voice>
        </speak>`;
        
        console.log('Using SSML for speech synthesis with style:', styleValue);
        
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
        synthesizerRef.current = synthesizer;
        
        synthesizerRef.current.speakSsmlAsync(
          ssmlText,
          result => {
            if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
              console.log('朗读完成');
              setStatus('朗读已完成');
              
              // 如果之前在录音，则恢复识别
              if (wasRecording) {
                setTimeout(() => {
                  if (isRecording) {
                    console.log('恢复识别');
                    initSpeechServices();
                    if (recognizerRef.current) {
                      try {
                        recognizerRef.current.startContinuousRecognitionAsync();
                        console.log('成功恢复识别');
                      } catch (error) {
                        console.error('恢复识别失败:', error);
                      }
                    }
                  }
                }, 500); // 延迟一点恢复识别，避免可能的回声
              }
            } else {
              console.error('语音合成错误:', result.errorDetails);
              setStatus(`朗读出错: ${result.errorDetails}`);
            }
          },
          error => {
            console.error('语音合成错误:', error);
            setStatus(`朗读出错: ${error}`);
            
            // 如果之前在录音，则恢复识别
            if (wasRecording && recognizerRef.current) {
              initSpeechServices();
              try {
                recognizerRef.current.startContinuousRecognitionAsync();
                console.log('成功恢复识别');
              } catch (error) {
                console.error('恢复识别失败:', error);
              }
            }
          }
        );
      } else {
        // 如果是通用风格，使用普通文本
        console.log('Using plain text for speech synthesis');
        
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
        synthesizerRef.current = synthesizer;
        
        synthesizerRef.current.speakTextAsync(
          textToSpeak,
          result => {
            if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
              console.log('朗读完成');
              setStatus('朗读已完成');
              
              // 如果之前在录音，则恢复识别
              if (wasRecording) {
                setTimeout(() => {
                  if (isRecording) {
                    console.log('恢复识别');
                    initSpeechServices();
                    if (recognizerRef.current) {
                      try {
                        recognizerRef.current.startContinuousRecognitionAsync();
                        console.log('成功恢复识别');
                      } catch (error) {
                        console.error('恢复识别失败:', error);
                      }
                    }
                  }
                }, 500); // 延迟一点恢复识别，避免可能的回声
              }
            } else {
              console.error('语音合成错误:', result.errorDetails);
              setStatus(`朗读出错: ${result.errorDetails}`);
            }
          },
          error => {
            console.error('语音合成错误:', error);
            setStatus(`朗读出错: ${error}`);
            
            // 如果之前在录音，则恢复识别
            if (wasRecording && recognizerRef.current) {
              initSpeechServices();
              try {
                recognizerRef.current.startContinuousRecognitionAsync();
                console.log('成功恢复识别');
              } catch (error) {
                console.error('恢复识别失败:', error);
              }
            }
          }
        );
      }
    } catch (error) {
      console.error('朗读文本时发生错误:', error);
      setStatus(`朗读出错: ${error}`);
    }
  };

  // 连接 WebSocket
  const connectWebSocket = () => {
    const url = 'wss://southeastasia.s2s.speech.microsoft.com/speech/translation/cognitiveservices/v1?from=zh-CN&to=en&scenario=conversation&Ocp-Apim-Subscription-Key=03i31zqdwDkhTmAAsiehuDiwtwURrrHSAFfZNxd3D9p2pZwSmStmJQQJ99BCACqBBLyXJ3w3AAAYACOGNB4V&X-ConnectionId=8D5852944D4C49B7A26C2D121638301E'

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      setStatus('已连接，准备好了')
      console.log('WebSocket connection established')
    }

    socket.onmessage = (event) => {
      const response = JSON.parse(event.data)

      // 处理翻译结果
      if (response.type === 'translation' && response.text) {
        setTranslatedText(response.text)
        setTextInput(response.text)

        // 如果有音频，播放音频
        if (response.audio) {
          playAudio(response.audio)
        }
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatus('连接错误')
    }

    socket.onclose = () => {
      console.log('WebSocket connection closed')
      setStatus('连接已关闭')
    }
  }

  // 播放音频
  const playAudio = (audioData: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // 将 base64 音频解码并播放
    const audioContent = atob(audioData)
    const arrayBuffer = new ArrayBuffer(audioContent.length)
    const view = new Uint8Array(arrayBuffer)

    for (let i = 0; i < audioContent.length; i++) {
      view[i] = audioContent.charCodeAt(i)
    }

    audioContextRef.current.decodeAudioData(arrayBuffer, (buffer) => {
      const source = audioContextRef.current!.createBufferSource()
      source.buffer = buffer
      source.connect(audioContextRef.current!.destination)
      source.start(0)
    })
  }

  // 开始录音
  const startRecording = async () => {
    try {
      // 重置时间戳和文本
      setLastRecognitionTimestamp(0);
      setRecognizedText('');
      setTranslatedText('');
      setTextInput('');
      
      // 初始化语音服务
      initSpeechServices();
      
      if (recognizerRef.current) {
        setIsRecording(true);
        setStatus('正在录音和监听...');
        
        // 开始连续识别
        recognizerRef.current.startContinuousRecognitionAsync(
          () => {
            console.log('开始连续识别');
          },
          (error) => {
            console.error('开始识别出错:', error);
            setStatus('启动识别失败');
            setIsRecording(false);
          }
        );
      } else {
        setStatus('语音识别器未初始化');
      }
    } catch (error) {
      console.error('开始录音出错:', error);
      setStatus('开始录音失败');
      setIsRecording(false);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (recognizerRef.current && isRecording) {
      // 重置时间戳，防止下次录音时误追加
      setLastRecognitionTimestamp(0);
      
      // 停止连续识别
      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          console.log('停止连续识别');
          setStatus('已停止录音');
          setIsRecording(false);
          
          // 保存当前识别的文本
          const currentRecognizedText = recognizedText;
          const currentTranslatedText = translatedText;
          
          // 如果有识别到文本但没有翻译，可以尝试再次合成
          if (currentRecognizedText && !currentTranslatedText) {
            setStatus('尝试翻译最后识别到的文本...');
            // 这里可以添加手动翻译的逻辑，如有必要
          }
          
          // 清理资源
          if (recognizerRef.current) {
            recognizerRef.current.close();
            recognizerRef.current = null;
          }
          
          if (synthesizerRef.current) {
            synthesizerRef.current.close();
            synthesizerRef.current = null;
          }
        },
        (error) => {
          console.error('停止识别出错:', error);
          setStatus('停止识别失败');
          setIsRecording(false);
        }
      );
    }
  };

  // 点击开始按钮的处理函数
  const handleStartClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }

      if (synthesizerRef.current) {
        synthesizerRef.current.close();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, [])

  // 监听语言和性别变化，重新初始化语音服务
  useEffect(() => {
    if (isRecording) {
      // 如果正在录音，先停止
      stopRecording();
      // 然后重新开始
      setTimeout(() => {
        startRecording();
      }, 500);
    }
  }, [sourceLanguage, targetLanguage, gender, voiceType])

  // 修改监听语言和性别变化的useEffect
  useEffect(() => {
    const languageCode = languageMap[targetLanguage] || 'en-US';
    console.log(`语言变更: ${targetLanguage} -> ${languageCode}`);
    
    const speakers = speakersMap[languageCode] || [];
    if (speakers.length === 0) {
      console.log(`警告: 未找到语言 ${languageCode} 的讲述人`);
      // 如果找不到该语言的讲述人，则尝试使用英语讲述人
      const englishSpeakers = speakersMap['en-US'] || [];
      setAvailableSpeakers(englishSpeakers);
      
      if (englishSpeakers.length > 0) {
        const defaultSpeaker = gender === 'female' 
          ? englishSpeakers.find(s => s.name.includes('女') || s.name.includes('female'))?.value || englishSpeakers[0].value 
          : englishSpeakers.find(s => s.name.includes('男') || s.name.includes('male'))?.value || englishSpeakers[0].value;
        
        console.log(`使用英语后备讲述人: ${defaultSpeaker}`);
        setSelectedSpeaker(defaultSpeaker);
        
        const speakerStyles = englishSpeakers.find(s => s.value === defaultSpeaker)?.styles || ['通用'];
        setAvailableStyles(speakerStyles);
        setSelectedStyle(speakerStyles[0] || '通用');
      }
    } else {
      console.log(`找到 ${speakers.length} 个语言为 ${languageCode} 的讲述人`);
      setAvailableSpeakers(speakers);
      
      // 设置默认讲述人，根据当前选择的性别
      const genderFiltered = gender === 'female' 
        ? speakers.filter(s => s.name.includes('女'))
        : speakers.filter(s => s.name.includes('男'));
      
      console.log(`基于性别过滤后找到 ${genderFiltered.length} 个讲述人`);
      
      // 如果找到了与当前性别匹配的讲述人，使用第一个；否则，使用所有讲述人中的第一个
      const defaultSpeaker = genderFiltered.length > 0 
        ? genderFiltered[0].value 
        : speakers[0].value;
      
      console.log(`选择讲述人: ${defaultSpeaker}`);
      setSelectedSpeaker(defaultSpeaker);
      
      // 设置该讲述人支持的风格
      const speakerStyles = speakers.find(s => s.value === defaultSpeaker)?.styles || ['通用'];
      setAvailableStyles(speakerStyles);
      setSelectedStyle(speakerStyles[0] || '通用');
    }
  }, [targetLanguage, gender]);

  // 当讲述人改变时更新可用风格
  useEffect(() => {
    if (selectedSpeaker) {
      const languageCode = languageMap[targetLanguage] || 'en-US';
      const speakers = speakersMap[languageCode] || [];
      const speaker = speakers.find(s => s.value === selectedSpeaker);
      if (speaker) {
        console.log(`更新讲述人 ${selectedSpeaker} 的可用风格`);
        setAvailableStyles(speaker.styles || ['通用']);
        setSelectedStyle(speaker.styles?.[0] || '通用');
      } else {
        console.log(`找不到讲述人 ${selectedSpeaker} 的风格信息，使用通用风格`);
        setAvailableStyles(['通用']);
        setSelectedStyle('通用');
      }
    }
  }, [selectedSpeaker, targetLanguage]);

  // 添加手动更新textInput的函数，确保它与translatedText同步
  const updateTextInput = () => {
    setTextInput(translatedText);
  };

  // 监听translatedText的变化，自动更新textInput
  useEffect(() => {
    updateTextInput();
  }, [translatedText]);

  // 清除所有文本
  const clearAll = () => {
    setRecognizedText('');
    setTranslatedText('');
    setTextInput('');
    lastSpokenTextRef.current = '';
    setLastRecognitionTimestamp(0);
    setStatus('已清除所有文本');
  };

  // 监听pauseThreshold变化，更新PAUSE_THRESHOLD
  useEffect(() => {
    // 转换为毫秒
    setPAUSE_THRESHOLD(pauseThreshold * 1000);
    console.log(`停顿阈值已更新: ${pauseThreshold}秒 (${pauseThreshold * 1000}毫秒)`);
    
    // 更新状态，显示阈值已更新
    setStatus(`停顿阈值已更新为 ${pauseThreshold} 秒`);
    
    // 3秒后恢复状态显示
    const timer = setTimeout(() => {
      setStatus('就绪');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [pauseThreshold]);

  return (
    <div className="tts-container">
      <div className="tts-content">
        <section className="account-info">
          <h2>账号信息</h2>
          <div className="info-item">
            <span className="info-label">登录账号：</span>
            <span className="info-value">1888888888</span>
          </div>
          <div className="info-item">
            <span className="info-label">剩余金额：</span>
            <span className="info-value amount">6378.5 元</span>
          </div>
          <div className="divider"></div>
        </section>

        <section className="voice-settings">
          <h2>语音配置</h2>

          <div className="setting-item">
            <span className="setting-label">原始语种</span>
            <div className="select-wrapper">
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                disabled={isRecording}
              >
                <option value="中文">中文（普通话，简体）</option>
                <option value="英语">英语（美国）</option>
                <option value="日语">日语</option>
              </select>
              <span className="select-arrow">▼</span>
              <button className="search-btn" title="搜索语种" disabled={isRecording}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">目标语种</span>
            <div className="select-wrapper">
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={isRecording}
              >
                <option value="英语">英语</option>
                <option value="中文(简体)">中文(简体)</option>
                <option value="中文(繁体)">中文(繁体)</option>
                <option value="日语">日语</option>
                <option value="韩语">韩语</option>
                <option value="法语">法语</option>
                <option value="德语">德语</option>
                <option value="西班牙语">西班牙语</option>
                <option value="俄语">俄语</option>
                <option value="阿拉伯语">阿拉伯语</option>
                <option value="意大利语">意大利语</option>
                <option value="葡萄牙语">葡萄牙语</option>
                <option value="荷兰语">荷兰语</option>
                <option value="希腊语">希腊语</option>
                <option value="瑞典语">瑞典语</option>
                <option value="土耳其语">土耳其语</option>
                <option value="泰语">泰语</option>
                <option value="越南语">越南语</option>
              </select>
              <span className="select-arrow">▼</span>
              <button className="search-btn" title="搜索语种" disabled={isRecording}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">性 别</span>
            <div className="gender-options">
              <label className="gender-option">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  disabled={isRecording}
                />
                <span className="radio-label">男声</span>
              </label>
              <label className="gender-option">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  disabled={isRecording}
                />
                <span className="radio-label">女声</span>
              </label>
            </div>
          </div>
          
          <div className="setting-item">
            <span className="setting-label">停顿阈值</span>
            <div className="pause-threshold-container">
              <input
                type="range"
                min="1"
                max="30"
                value={pauseThreshold}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setPauseThreshold(newValue);
                  // 更新滑块背景
                  const percent = ((newValue - 1) / 29) * 100;
                  e.target.style.background = `linear-gradient(to right, #4a90e2 0%, #4a90e2 ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`;
                }}
                style={{
                  background: `linear-gradient(to right, #4a90e2 0%, #4a90e2 ${((pauseThreshold - 1) / 29) * 100}%, #e0e0e0 ${((pauseThreshold - 1) / 29) * 100}%, #e0e0e0 100%)`
                }}
                disabled={isRecording}
                className="pause-threshold-slider"
              />
              <span className="pause-threshold-value">{pauseThreshold}秒</span>
              <div className="pause-threshold-help">
                停顿时间小于此值时将追加文本而非替换
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#4a90e2' }}>
                  当前生效值: {PAUSE_THRESHOLD/1000}秒
                </div>
              </div>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">讲述人</span>
            <div className="select-wrapper">
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                disabled={isRecording}
              >
                {/* 先显示与所选性别匹配的讲述人 */}
                {gender === 'female' ? (
                  <optgroup label="女声讲述人">
                    {availableSpeakers
                      .filter(speaker => speaker.name.includes('女'))
                      .map((speaker, index) => (
                        <option key={`female-${index}`} value={speaker.value}>
                          {speaker.name}
                        </option>
                      ))}
                  </optgroup>
                ) : (
                  <optgroup label="男声讲述人">
                    {availableSpeakers
                      .filter(speaker => speaker.name.includes('男'))
                      .map((speaker, index) => (
                        <option key={`male-${index}`} value={speaker.value}>
                          {speaker.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>

          <div className="setting-item">
            <span className="setting-label">语音风格</span>
            <div className="select-wrapper">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                disabled={isRecording}
              >
                {availableStyles.map((style, index) => (
                  <option key={index} value={style}>{style}</option>
                ))}
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>

          <div className="text-input-area">
            {recognizedText && (
              <div className="recognized-text">
                <strong>识别原文:</strong> {recognizedText}
              </div>
            )}
            <div className="translation-label">翻译结果：</div>
            <textarea
              placeholder={isRecording ? "正在录音..." : "这里将显示翻译结果"}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              readOnly={isRecording}
            ></textarea>
            <div className="status-bar">
              <span className="status-indicator">状态: {status}</span>
            </div>
          </div>

          <div className="start-button-container">
            <button
              className={`start-button ${isRecording ? 'recording' : ''}`}
              onClick={handleStartClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              {isRecording ? '停止' : '开始'}
            </button>
            {!isRecording && textInput && (
              <button 
                className="speak-button"
                onClick={() => speakTranslatedText(textInput)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
                朗读
              </button>
            )}
            {(recognizedText || textInput) && (
              <button 
                className="clear-button"
                onClick={clearAll}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                清除
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home


