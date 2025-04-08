import React, { useState, useRef, useEffect } from 'react'
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk'
import './Home.css'
import { useNavigate } from 'react-router-dom'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [textInput, setTextInput] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('中文')
  const [targetLanguage, setTargetLanguage] = useState('英语')

  // 用户信息状态
  const [userData, setUserData] = useState<any>(null)
  // 添加计时相关状态
  const [timer, setTimer] = useState<number>(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setTimeout> | null>(null)

  // 语音转换状态
  const [isRecording, setIsRecording] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const [status, setStatus] = useState('就绪')

  // 使用ref跟踪当前翻译文本，避免异步更新问题
  const translatedTextRef = useRef<string>('');

  // 使用ref跟踪最后识别时间戳
  const lastTimestampRef = useRef<number>(0);

  // 添加一个变量来存储完整的翻译结果
  const completeTranslationRef = useRef<string>('');

  // 添加一个标志来跟踪是否正在播放语音
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  // Speech SDK 相关状态
  const [recognizedText, setRecognizedText] = useState('')

  // 添加语音队列状态
  const speechQueueRef = useRef<string[]>([]);
  const [isSpeechQueueProcessing, setIsSpeechQueueProcessing] = useState<boolean>(false);

  // WebSocket 和音频相关引用
  const audioContextRef = useRef<AudioContext | null>(null)

  // Speech SDK 相关引用
  const recognizerRef = useRef<speechsdk.TranslationRecognizer | null>(null)
  const synthesizerRef = useRef<speechsdk.SpeechSynthesizer | null>(null)
  const speechConfigRef = useRef<speechsdk.SpeechConfig | null>(null)

  // 使用新的认知服务配置
  const region = 'eastus'
  const key = 'AXjBCilwI1TvNlAI9HaY5J86yazg0LYSbMyMtHpShl16KbnfUvdcJQQJ99BCACYeBjFXJ3w3AAAYACOGZokI'

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

  // 添加一个变量来跟踪上次朗读的文本
  const lastSpokenTextRef = useRef<string>('');

  // 添加追加文本的工具函数，确保文本间有空格
  const appendWithSpace = (originalText: string, newText: string) => {
    if (!originalText) return newText;
    if (!newText) return originalText;

    // 确保两个文本之间有且只有一个空格
    const trimmedOriginal = originalText.trimEnd();
    const trimmedNew = newText.trimStart();

    return `${trimmedOriginal} ${trimmedNew}`;
  };

  // 初始化语音服务配置
  const initSpeechServices = async () => {
    try {
      // 首先检查麦克风权限
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.error('麦克风访问失败:', error);
        setStatus('无法访问麦克风，请检查浏览器权限设置');
        return;
      }

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
      
      // 创建语音合成器
      const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
      synthesizerRef.current = synthesizer;
      
      // 创建翻译配置
      const translationConfig = speechsdk.SpeechTranslationConfig.fromSubscription(key, region);
      translationConfig.speechRecognitionLanguage = fromLanguage;
      
      // 添加目标语言
      const simplifiedToLanguage = toLanguage.split('-')[0];
      translationConfig.addTargetLanguage(simplifiedToLanguage);
      
      // 设置音频配置
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      
      // 创建翻译识别器
      const translator = new speechsdk.TranslationRecognizer(translationConfig, audioConfig);
      
      // 处理识别结果
      translator.recognized = (_s, e) => {
        console.log('识别事件触发', e.result.reason);

        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          // 识别完成（一段话结束）
          const recognizedText = e.result.text;
          if (recognizedText.trim() !== '') {
            console.log('识别到完整的语音:', recognizedText);

            // 更新临时识别文本
            if (tempRecognizedTextRef.current) {
              // 如果之前有临时文本，这是一个完整的段落，添加到播放队列
              setRecognizedText(tempRecognizedTextRef.current);

              // 获取翻译结果
              const translatedResult = e.result.translations.get(simplifiedToLanguage) || '';
              if (translatedResult) {
                // 将新的完整翻译追加到之前的翻译中
                completeTranslationRef.current = appendWithSpace(completeTranslationRef.current, translatedResult);
                translatedTextRef.current = completeTranslationRef.current;
                setTranslatedText(completeTranslationRef.current);
                setTextInput(completeTranslationRef.current);

                // 添加到语音队列
                if (!isPlayingRef.current) {
                  addToSpeechQueue(translatedResult);
                }
              }

              // 重置临时文本
              tempRecognizedTextRef.current = '';
            } else {
              setRecognizedText(recognizedText);

              // 获取翻译结果
              const translatedResult = e.result.translations.get(simplifiedToLanguage) || '';
              if (translatedResult) {
                // 将新的完整翻译追加到之前的翻译中
                completeTranslationRef.current = appendWithSpace(completeTranslationRef.current, translatedResult);
                translatedTextRef.current = completeTranslationRef.current;
                setTranslatedText(completeTranslationRef.current);
                setTextInput(completeTranslationRef.current);

                // 添加到语音队列
                if (!isPlayingRef.current) {
                  addToSpeechQueue(translatedResult);
                }
              }
            }
          }
        } else if (e.result.reason === speechsdk.ResultReason.TranslatedSpeech) {
          // 处理翻译结果
          if (fromLanguage !== targetLanguage) {
            const recognizedText = e.result.text;
            if (recognizedText.trim() !== '') {
              // 累积识别的文本
              setRecognizedText(recognizedText);

              // 处理翻译结果
              const translatedResult = e.result.translations.get(simplifiedToLanguage) || '';
              if (translatedResult) {
                // 将新的完整翻译追加到之前的翻译中
                completeTranslationRef.current = appendWithSpace(completeTranslationRef.current, translatedResult);
                translatedTextRef.current = completeTranslationRef.current;
                setTranslatedText(completeTranslationRef.current);
                setTextInput(completeTranslationRef.current);

                // 添加到语音队列
                if (!isPlayingRef.current) {
                  addToSpeechQueue(translatedResult);
                }
              }
            }
          }
        }
      };

      // 处理识别进度 - 实现实时逐字符翻译
      translator.recognizing = (_s, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizingSpeech) {
          // 实时识别中 - 存储临时识别文本，但不添加到播放队列
          const partialText = e.result.text;
          if (partialText.trim() !== '') {
            tempRecognizedTextRef.current = partialText;
            setRecognizedText(partialText);

            // 显示实时翻译结果，但不添加到播放队列
            const translatedResult = e.result.translations.get(simplifiedToLanguage) || '';
            if (translatedResult) {
              // 显示实时翻译结果，但不更新完整翻译
              translatedTextRef.current = appendWithSpace(completeTranslationRef.current, translatedResult);
              setTranslatedText(translatedTextRef.current);
              setTextInput(translatedTextRef.current);
            }
          }
        }
      };

      recognizerRef.current = translator;
      
      setStatus('语音服务已准备好');
    } catch (error) {
      console.error('初始化语音服务错误:', error);
      setStatus('初始化语音服务错误，请检查麦克风权限');
    }
  };

  // 扩展朗读翻译后的文本功能，增加智能朗读控制
  // 删除 speakTranslatedText 函数

  // 真正执行语音合成的函数 - 由队列处理器调用
  const executeSpeakText = async (text: string) => {
    // 设置播放状态为true - 立即设置以防止多次调用
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentPlayingTextRef.current = text;
    console.log(`🎵 开始朗读文本: "${text}"`);

    const maxRetries = 3;
    let retryCount = 0;

    const trySpeak = async () => {
      try {
        setStatus('正在朗读...');

        // 如果文本太长，可能需要截断或分段处理
        const maxTextLength = 1000; // 设置最大文本长度

        // 如果文本长度超过最大值，只朗读最后部分
        if (text.length > maxTextLength) {
          console.log(`⚠️ 文本过长 (${text.length} 字符), 截断为最后 ${maxTextLength} 字符`);
          text = text.substring(text.length - maxTextLength);
        }

        // 如果正在录音，先暂停识别以避免回声
        let wasRecording = false;
        if (isRecording && recognizerRef.current) {
          wasRecording = true;
          console.log('🎤 暂时暂停识别以避免回声');
          try {
            recognizerRef.current.stopContinuousRecognitionAsync();
            console.log('✅ 成功暂停识别');
          } catch (error) {
            console.error('❌ 暂停识别失败:', error);
          }
        }

        // 创建新的合成器
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(key, region);

        // 确保为目标语言选择正确的语音
        const languageCode = languageMap[targetLanguage] || 'en-US';
        console.log(`🌐 语音合成使用语言代码: ${languageCode}`);

        // 如果没有选择讲述人，选择默认讲述人
        if (!selectedSpeaker) {
          const speakers = speakersMap[languageCode] || [];
          if (speakers.length > 0) {
            const defaultSpeaker = gender === 'female'
              ? speakers.find(s => s.name.includes('女'))?.value || speakers[0].value
              : speakers.find(s => s.name.includes('男'))?.value || speakers[0].value;

            speechConfig.speechSynthesisVoiceName = defaultSpeaker;
            console.log(`👤 使用默认讲述人: ${defaultSpeaker}`);
          } else {
            speechConfig.speechSynthesisVoiceName = 'en-US-AriaNeural';
            console.log('⚠️ 未找到目标语言的讲述人，使用英语默认讲述人');
          }
        } else {
          speechConfig.speechSynthesisVoiceName = selectedSpeaker;
          console.log(`👤 使用选定讲述人: ${selectedSpeaker}`);
        }

        // 设置连接超时和重试参数
        speechConfig.setProperty("SpeechServiceConnection_Timeout", "10000");
        speechConfig.setProperty("SpeechServiceConnection_RetryCount", "3");

        // 如果有选择风格，则使用SSML格式
        if (selectedStyle && selectedStyle !== '通用') {
          const styleValue = styleMap[selectedStyle] || 'general';
          const langCode = languageMap[targetLanguage] || 'en-US';
          const ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${langCode}">
            <voice name="${selectedSpeaker || speechConfig.speechSynthesisVoiceName}">
              <mstts:express-as style="${styleValue}">
                ${text}
              </mstts:express-as>
            </voice>
          </speak>`;

          console.log('🎭 使用风格进行语音合成:', styleValue);

          const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
          synthesizerRef.current = synthesizer;

          synthesizerRef.current.speakSsmlAsync(
            ssmlText,
            result => {
              if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                console.log('朗读完成');
                setStatus('朗读已完成');

                // 重置播放状态
                isPlayingRef.current = false;
                setIsPlaying(false);
                currentPlayingTextRef.current = '';

                // 处理队列中的下一个文本
                processSpeechQueue();

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
                  }, 500);
                }
              } else {
                console.error('语音合成错误:', result.errorDetails);
                setStatus(`朗读出错: ${result.errorDetails}`);

                // 如果错误是连接问题，尝试重试
                if (result.errorDetails && result.errorDetails.includes('Unable to contact server') && retryCount < maxRetries) {
                  retryCount++;
                  console.log(`重试朗读 (${retryCount}/${maxRetries})...`);
                  setTimeout(trySpeak, 1000 * retryCount); // 指数退避重试
                  return;
                }

                // 重置播放状态
                isPlayingRef.current = false;
                setIsPlaying(false);
                currentPlayingTextRef.current = '';

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
            },
            (error: any) => {
              console.error('语音合成错误:', error);
              setStatus(`朗读出错: ${error.message || error}`);

              // 如果错误是连接问题，尝试重试
              if ((error.message || error).toString().includes('Unable to contact server') && retryCount < maxRetries) {
                retryCount++;
                console.log(`重试朗读 (${retryCount}/${maxRetries})...`);
                setTimeout(trySpeak, 1000 * retryCount); // 指数退避重试
                return;
              }

              // 重置播放状态
              isPlayingRef.current = false;
              setIsPlaying(false);
              currentPlayingTextRef.current = '';

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
            text,
            result => {
              if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                console.log('朗读完成');
                setStatus('朗读已完成');

                // 重置播放状态
                isPlayingRef.current = false;
                setIsPlaying(false);
                currentPlayingTextRef.current = '';

                // 处理队列中的下一个文本
                processSpeechQueue();

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
                  }, 500);
                }
              } else {
                console.error('语音合成错误:', result.errorDetails);
                setStatus(`朗读出错: ${result.errorDetails}`);

                // 如果错误是连接问题，尝试重试
                if (result.errorDetails && result.errorDetails.includes('Unable to contact server') && retryCount < maxRetries) {
                  retryCount++;
                  console.log(`重试朗读 (${retryCount}/${maxRetries})...`);
                  setTimeout(trySpeak, 1000 * retryCount); // 指数退避重试
                  return;
                }

                // 重置播放状态
                isPlayingRef.current = false;
                setIsPlaying(false);
                currentPlayingTextRef.current = '';

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
            },
            (error: any) => {
              console.error('语音合成错误:', error);
              setStatus(`朗读出错: ${error.message || error}`);

              // 如果错误是连接问题，尝试重试
              if ((error.message || error).toString().includes('Unable to contact server') && retryCount < maxRetries) {
                retryCount++;
                console.log(`重试朗读 (${retryCount}/${maxRetries})...`);
                setTimeout(trySpeak, 1000 * retryCount); // 指数退避重试
                return;
              }

              // 重置播放状态
              isPlayingRef.current = false;
              setIsPlaying(false);
              currentPlayingTextRef.current = '';

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
      } catch (error: any) {
        console.error('朗读文本时发生错误:', error);
        setStatus(`朗读出错: ${error.message || error}`);

        // 如果错误是连接问题，尝试重试
        if ((error.message || error).toString().includes('Unable to contact server') && retryCount < maxRetries) {
          retryCount++;
          console.log(`重试朗读 (${retryCount}/${maxRetries})...`);
          setTimeout(trySpeak, 1000 * retryCount); // 指数退避重试
          return;
        }

        // 重置播放状态
        isPlayingRef.current = false;
        setIsPlaying(false);
        currentPlayingTextRef.current = '';
      }
    };

    // 开始第一次尝试
    trySpeak();
  };

  // 停止当前语音播放
  const stopSpeaking = () => {
    if (synthesizerRef.current) {
      console.log('🛑 手动停止语音播放');
      try {
        // 关闭合成器会触发其 close 方法，释放资源
        synthesizerRef.current.close();
        synthesizerRef.current = null;

        // 重置播放状态
        isPlayingRef.current = false;
        setIsPlaying(false);
        setStatus('已停止朗读');

        // 清空语音队列
        console.log(`🧹 清空语音队列，原有 ${speechQueueRef.current.length} 个待播放文本`);
        speechQueueRef.current = [];
        setIsSpeechQueueProcessing(false);

        console.log('✅ 语音播放和队列已完全停止');
      } catch (error) {
        console.error('❌ 停止语音播放错误:', error);
      }
    } else {
      console.log('ℹ️ 没有活跃的语音合成器，无需停止');

      // 以防万一，也清空队列
      if (speechQueueRef.current.length > 0) {
        console.log(`🧹 清空语音队列，原有 ${speechQueueRef.current.length} 个待播放文本`);
        speechQueueRef.current = [];
        setIsSpeechQueueProcessing(false);
      }
    }
  };

  // 开始录音
  const startRecording = async () => {
    try {
      // 如果正在播放，先停止播放
      if (synthesizerRef.current) {
        stopSpeaking();
      }
      
      // 重置时间戳和文本
      lastTimestampRef.current = 0;
      setRecognizedText('');
      setTranslatedText('');
      setTextInput('');
      translatedTextRef.current = '';
      
      // 初始化语音服务
      await initSpeechServices();
      
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
            stopTimer(); // 停止计时
          }
        );
      } else {
        setStatus('语音识别器未初始化');
      }
    } catch (error) {
      console.error('开始录音出错:', error);
      setStatus('开始录音失败');
      setIsRecording(false);
      stopTimer(); // 停止计时
    }
  };

  // 停止录音
  const stopRecording = () => {
    // 停止计时
    stopTimer();

    if (recognizerRef.current && isRecording) {
      // 重置时间戳，防止下次录音时误追加
      lastTimestampRef.current = 0;

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

  // 添加计时功能
  const startTimer = () => {
    // 清除之前可能存在的计时器
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    // 重置计时器
    setTimer(0);

    // 创建新的计时器，每秒更新一次
    const interval = setInterval(async () => {
      setTimer(prevTimer => {
        const newTime = prevTimer + 1;

        // 每60秒减少1分钟的剩余时长并调用API
        if (newTime % 60 === 0) {
          // 调用更新时间的API
          const updateTime = async () => {
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                console.error('未找到token');
                return;
              }

              const response = await fetch('/api/update?time=1', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': '*/*',
                }
              });

              const data = await response.json();
              if (data.code === 200) {
                // 更新本地用户数据
                if (userData) {
                  const newUserData = {
                    ...userData,
                    time: Math.max(0, userData.time - 1)
                  };
                  setUserData(newUserData);
                  localStorage.setItem('user', JSON.stringify(newUserData));

                  // 如果剩余时长归零，停止录音
                  if (newUserData.time <= 0) {
                    stopRecording();
                    setStatus('剩余时长已用完，已停止录音');
                  }
                }
              } else {
                console.error('更新时间失败:', data.msg);
                // 如果是认证失败，清除token并返回登录页
                if (data.msg && data.msg.includes('认证失败')) {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/');
                }
              }
            } catch (error) {
              console.error('更新时间请求失败:', error);
              // 请求失败时也清除token并返回登录页
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/');
            }
          };

          // 执行更新时间
          updateTime();
        }

        return newTime;
      });
    }, 1000);

    setTimerInterval(interval);
  };

  // 停止计时
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // 点击开始按钮的处理函数
  const handleStartClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        // 检查用户剩余时长
        if (userData && userData.time <= 0) {
          setStatus('剩余时长已用完，请充值后继续使用');
          return;
        }

        // 立即调用减少时间的接口
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('未找到token');
          navigate('/');
          return;
        }

        const response = await fetch('/api/update?time=1', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': '*/*',
          }
        });

        const data = await response.json();
        if (data.code === 200) {
          // 更新本地用户数据
          if (userData) {
            const newUserData = {
              ...userData,
              time: Math.max(0, userData.time - 1)
            };
            setUserData(newUserData);
            localStorage.setItem('user', JSON.stringify(newUserData));
          }

          // 开始录音和计时
          await startRecording();
          startTimer(); // 确保在开始录音后启动计时器
        } else {
          console.error('更新时间失败:', data.msg);
          // 如果是认证失败，清除token并返回登录页
          if (data.msg && data.msg.includes('认证失败')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('更新时间请求失败:', error);
        // 请求失败时也清除token并返回登录页
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      }
    }
  };

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      stopTimer(); // 清理计时器

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
  }, [sourceLanguage, targetLanguage, gender])

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
  // const updateTextInput = () => {
  //   setTextInput(translatedText);
  // };

  // 监听translatedText的变化，自动更新textInput
  useEffect(() => {
    console.log(`[useEffect-translatedText] 调用，translatedText="${translatedText}"`);
    console.log(`[useEffect-translatedText] 当前textInput="${textInput}"`);
    console.log(`[useEffect-translatedText] 当前ref="${translatedTextRef.current}"`);

    // 同步更新ref和textInput
    translatedTextRef.current = translatedText;
    setTextInput(translatedText);
    console.log(`[useEffect-translatedText] 更新textInput="${translatedText}"`);
  }, [translatedText]);

  // 清除所有文本
  const clearAll = () => {
    // 停止语音播放
    stopSpeaking();

    // 清空语音队列
    speechQueueRef.current = [];
    setIsSpeechQueueProcessing(false);

    // 清空所有文本框
    setTextInput('');
    setRecognizedText('');
    setTranslatedText('');
    translatedTextRef.current = '';

    // 重置上次朗读文本
    lastSpokenTextRef.current = '';

    // 更新状态
    setStatus('已清空所有内容');
  };

  // 添加一个函数来比较文本，防止重复朗读
  const isTextDuplicate = (oldText: string, newText: string): boolean => {
    if (!oldText || !newText) return false;

    // 完全相同的文本
    if (oldText === newText) return true;

    // 新文本包含在旧文本中
    if (oldText.includes(newText)) return true;

    // 旧文本包含在新文本中，且新文本只增加了少量字符
    if (newText.includes(oldText) && newText.length - oldText.length < 3) return true;

    return false;
  };

  // 添加语音到队列并处理
  const addToSpeechQueue = (text: string) => {
    console.log(`➕ 添加文本到语音队列: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // 如果当前正在播放，将新文本追加到当前播放的文本中
    if (isPlayingRef.current && currentPlayingTextRef.current) {
      console.log('🎵 当前正在播放，追加文本到当前播放');
      currentPlayingTextRef.current = appendWithSpace(currentPlayingTextRef.current, text);
      return;
    }

    // 将文本添加到队列
    speechQueueRef.current.push(text);
    console.log(`📊 当前队列长度: ${speechQueueRef.current.length}`);

    // 如果队列处理器未运行，则启动它
    if (!isSpeechQueueProcessing) {
      console.log('🚀 启动队列处理器');
      processSpeechQueue();
    } else {
      console.log('ℹ️ 队列处理器已在运行，文本已添加到队列');
    }
  };

  // 添加语音队列处理状态ref
  const isProcessingQueueRef = useRef(false)

  // 处理语音队列
  const processSpeechQueue = async () => {
    if (isProcessingQueueRef.current) {
      console.log('🔄 队列正在处理中，跳过本次处理')
      return
    }

    if (speechQueueRef.current.length === 0) {
      console.log('📢 语音队列为空，停止处理')
      isProcessingQueueRef.current = false
      return
    }

    try {
      isProcessingQueueRef.current = true
      console.log('🎯 开始处理语音队列')
      console.log('📊 当前队列状态:', {
        queueLength: speechQueueRef.current.length,
        isProcessing: isProcessingQueueRef.current,
        currentText: speechQueueRef.current[0]
      })

      const text = speechQueueRef.current[0]
      if (!text) {
        console.log('⚠️ 队列中的文本为空，跳过处理')
        return
      }

      console.log('🔍 检查文本是否重复:', {
        text,
        lastText: lastSpokenTextRef.current,
        isDuplicate: isTextDuplicate(lastSpokenTextRef.current, text)
      })

      if (isTextDuplicate(lastSpokenTextRef.current, text)) {
        console.log('⏭️ 检测到重复文本，跳过播放')
        speechQueueRef.current.shift()
        return
      }

      console.log('🎵 准备播放文本:', text)
      await executeSpeakText(text)
      console.log('✅ 文本播放完成')

      speechQueueRef.current.shift()
      console.log('📊 更新后队列状态:', {
        remainingItems: speechQueueRef.current.length,
        isProcessing: isProcessingQueueRef.current
      })
    } catch (error) {
      console.error('❌ 处理语音队列时出错:', error)
    } finally {
      isProcessingQueueRef.current = false
      console.log('🏁 队列处理完成，重置处理状态')
    }
  }

  // 获取用户信息
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUserData(parsedUser)
        console.log('已加载用户信息:', parsedUser)
      }
    } catch (error) {
      console.error('读取用户信息失败:', error)
    }
  }, [])

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('未找到token')
        navigate('/')
        return
      }

      const response = await fetch('/api/getInfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        }
      })

      const data = await response.json()
      if (data.code === 200 && data.user) {
        setUserData(data.user)
        // 更新localStorage中的用户信息
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        console.error('获取用户信息失败:', data.msg)
        // 如果是认证失败，清除token并返回登录页
        if (data.msg && data.msg.includes('认证失败')) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          navigate('/')
        }
      }
    } catch (error) {
      console.error('获取用户信息请求失败:', error)
      // 请求失败时也清除token并返回登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/')
    }
  }

  // 组件加载时获取用户信息
  useEffect(() => {
    fetchUserInfo()
  }, [])

  // 添加一个变量来跟踪当前正在播放的文本
  const currentPlayingTextRef = useRef<string>('');

  // 添加一个变量来存储临时识别的文本
  const tempRecognizedTextRef = useRef<string>('');

  return (
    <div className="tts-container">
      <div className="tts-content">
        <section className="account-info">
          <h2>账号信息</h2>
          <div className="info-item">
            <span className="info-label">登录账号：</span>
            <span className="info-value">{userData?.userName || '未登录'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">剩余时长：</span>
            <span className="info-value amount">{userData?.time || 0} 分钟</span>
          </div>
          {isRecording && (
            <div className="info-item timer">
              <span className="info-label">已用时间：</span>
              <span className="info-value timer-value">
                {Math.floor(timer / 60)}分{timer % 60}秒
              </span>
            </div>
          )}
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
            <div className="translation-label">翻译结果：</div>
            <textarea
              placeholder={isRecording ? "正在录音..." : "这里将显示翻译结果"}
              value={translatedTextRef.current || textInput}
              onChange={(e) => {
                // 同时更新所有文本状态以保持一致
                const newText = e.target.value;
                setTextInput(newText);
                setTranslatedText(newText);
                translatedTextRef.current = newText;
              }}
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
            {!isRecording && (textInput || translatedTextRef.current) && (
              <button
                className={`speak-button ${isPlaying ? 'speaking' : ''}`}
                onClick={() => {
                  if (isPlaying) {
                    stopSpeaking();
                  } else {
                    addToSpeechQueue(textInput);
                  }
                }}
                disabled={!textInput || textInput.trim() === ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isPlaying ? (
                    <>
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </>
                  )}
                </svg>
                {isPlaying ? '停止朗读' : '朗读'}
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
            {!isRecording && (
              <button
                className="export-button"
                onClick={() => {
                  // 获取当前文本
                  const currentText = translatedTextRef.current || textInput || translatedText || "";

                  // 创建文本文件
                  const blob = new Blob([currentText], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);

                  // 创建下载链接
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `translation_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`;

                  // 触发下载
                  document.body.appendChild(a);
                  a.click();

                  // 清理
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                style={{
                  marginLeft: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '10px 20px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                导出文本
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Home


