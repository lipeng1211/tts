//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.md file in the project root for full license information.
//
// <code>
package speechsdk.quickstart;

import java.io.IOException;
import java.util.Map;
import java.util.Scanner;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.CompletableFuture;

import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.*;
import com.microsoft.cognitiveservices.speech.translation.*;

import javax.sound.sampled.*;
import javax.sound.sampled.AudioInputStream;
import java.io.ByteArrayInputStream;

/**
 * 语音翻译示例程序
 * 该程序展示如何使用Microsoft认知服务语音SDK进行实时语音识别和翻译
 * 支持从中文输入翻译到英文输出
 * 实现了增强回声消除功能，避免录入播放的合成语音
 */
public class Main {

    /**
     * 使用麦克风进行语音翻译的主要方法
     * 该方法配置语音翻译服务，初始化识别器，并设置事件监听器处理各种识别和翻译事件
     * 从中文输入翻译成英文输出
     */
    public static void translationWithMicrophoneAsync() throws InterruptedException, ExecutionException, IOException, java.net.URISyntaxException
    {
        // 替换为您自己的订阅密钥
        String speechSubscriptionKey = "C4w7owYrsgOu2ta7iOwDfNui4x95Rg0m80a0rpE39QTOuMcCKg70JQQJ99BCAC5RqLJXJ3w3AAAYACOGy4xL";
        // 替换为您自己的终端URL (例如, "https://westus.api.cognitive.microsoft.com")
        String endpointUrl = "https://westeurope.api.cognitive.microsoft.com";

        // 使用指定的终端URL和订阅密钥创建语音翻译配置，并使用麦克风作为默认音频输入
        try (SpeechTranslationConfig config = SpeechTranslationConfig.fromEndpoint(new java.net.URI(endpointUrl), speechSubscriptionKey)) {

            // 设置源语言和目标语言
            String fromLanguage = "zh-CN";  // 设置源语言为中文
            config.setSpeechRecognitionLanguage(fromLanguage);  // 设置识别的源语言为中文
            config.addTargetLanguage("en");  // 添加英语作为翻译目标语言

            // 设置语音合成输出的声音名称
            String EnglishVoice = "en-US-JennyNeural";  // 使用英语女声Jenny（神经网络语音）
            config.setVoiceName(EnglishVoice);

            // 创建音频配置并启用回声消除功能
            AudioConfig audioConfig = AudioConfig.fromDefaultMicrophoneInput();

            // 在SpeechConfig中设置高级音频处理属性，增强回声消除效果
            // 启用音频日志记录，便于调试
            config.setProperty(PropertyId.Speech_LogFilename, "translationLogs.txt");
            config.setProperty(PropertyId.SpeechServiceConnection_EnableAudioLogging, "true");

            // 回声消除相关设置 - 使用字符串常量代替SDK中不存在的PropertyId
            config.setProperty("echo-cancellation", "true");
            config.setProperty("AUDIO-CONFIG-ENABLE-ECHO-CANCELLATION", "true");
            config.setProperty("AUDIO-CONFIG-ENABLE-ADAPTIVE-ECHO-CANCELLATION", "true"); // 自适应回声消除

            // 降噪和音频增强设置 - 使用字符串常量代替SDK中不存在的PropertyId
            config.setProperty("noise-suppression", "high"); // 设置为高级降噪
            config.setProperty("AUDIO-CONFIG-ENABLE-NOISE-SUPPRESSION", "true");
            config.setProperty("AUDIO-CONFIG-ENABLE-AUTO-GAIN-CONTROL", "true");  // 自动增益控制

            // 设置麦克风方向性，以便更好地定位说话者
            config.setProperty("AUDIO-CONFIG-MICROPHONE-DIRECTIONALITY", "omnidirectional");

            // 增强语音检测
            config.setProperty(PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "1000"); // 调整静音超时时间
            config.setProperty("segmentation-silence-timeout-ms", "500");

            try (TranslationRecognizer recognizer = new TranslationRecognizer(config, audioConfig)) {
                // 订阅各种事件

                // 正在识别事件 - 当语音正被识别但尚未完成时触发
                recognizer.recognizing.addEventListener((s, e) -> {
                    System.out.println("RECOGNIZING in '" + fromLanguage + "': Text=" + e.getResult().getText());

                    Map<String, String> map = e.getResult().getTranslations();
                    for(String element : map.keySet()) {
                        System.out.println("    TRANSLATING into '" + element + "': " + map.get(element));
                    }
                });

                // 识别完成事件 - 当语音段落被完全识别后触发
                recognizer.recognized.addEventListener((s, e) -> {
                    if (e.getResult().getReason() == ResultReason.TranslatedSpeech) {
                        // 当语音被成功识别并翻译时
                        System.out.println("RECOGNIZED in '" + fromLanguage + "': Text=" + e.getResult().getText());

                        Map<String, String> map = e.getResult().getTranslations();
                        for(String element : map.keySet()) {
                            System.out.println("    TRANSLATED into '" + element + "': " + map.get(element));
                        }
                    }
                    if (e.getResult().getReason() == ResultReason.RecognizedSpeech) {
                        // 当语音被识别但没有被翻译时
                        System.out.println("RECOGNIZED: Text=" + e.getResult().getText());
                        System.out.println("    Speech not translated.");
                    }
                    else if (e.getResult().getReason() == ResultReason.NoMatch) {
                        // 当语音无法被识别时
                        System.out.println("NOMATCH: Speech could not be recognized.");
                    }
                });

                // 语音合成事件 - 当翻译后的文本被合成为语音时触发
                recognizer.synthesizing.addEventListener((s, e) -> {
                    if (e.getResult().getAudio().length > 0) { // 仅在有音频数据时处理
                        System.out.println("播放开始");
                        CompletableFuture.runAsync(() -> {
                            try {
                                recognizer.stopContinuousRecognitionAsync().get();
                                System.out.println("Synthesis result received. Size of audio data: " + e.getResult().getAudio().length);
                                
                                // 创建音频流并播放
                                AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(
                                    new ByteArrayInputStream(e.getResult().getAudio()));
                                Clip clip = AudioSystem.getClip();
                                clip.open(audioInputStream);
                                
                                // 调整音量以改善回声消除效果
                                FloatControl volumeControl = (FloatControl) clip.getControl(FloatControl.Type.MASTER_GAIN);
                                float volume = -5.0f; // 稍微降低音量，减少可能的回声
                                volumeControl.setValue(volume);
                                
                                clip.start();
                                clip.addLineListener(event -> {
                                    if (event.getType() == LineEvent.Type.STOP) {
                                        System.out.println("播放结束");
                                        recognizer.startContinuousRecognitionAsync(); // 重新启动识别器
                                    }
                                });
                            } catch (Exception ex) {
                                System.out.println("播放音频失败: " + ex.getMessage());
                            }
                        });
                    }
                });

                // 取消事件 - 当识别过程被取消时触发
                recognizer.canceled.addEventListener((s, e) -> {
                    System.out.println("CANCELED: Reason=" + e.getReason());

                    if (e.getReason() == CancellationReason.Error) {
                        // 当取消原因是错误时，显示详细的错误信息
                        System.out.println("CANCELED: ErrorCode=" + e.getErrorCode());
                        System.out.println("CANCELED: ErrorDetails=" + e.getErrorDetails());
                        System.out.println("CANCELED: Did you update the subscription info?");
                    }
                });

                // 会话开始事件
                recognizer.sessionStarted.addEventListener((s, e) -> {
                    System.out.println("\nSession started event.");
                });

                // 会话结束事件
                recognizer.sessionStopped.addEventListener((s, e) -> {
                    System.out.println("\nSession stopped event.");
                });

                // 开始连续识别。使用StopContinuousRecognitionAsync()方法来停止识别
                System.out.println("请说些中文...");  // 提示用户说中文
                recognizer.startContinuousRecognitionAsync().get();

                System.out.println("按任意键停止");  // 更新提示为中文
                new Scanner(System.in).nextLine();  // 等待用户按键来停止识别

                // 停止连续识别
                recognizer.stopContinuousRecognitionAsync().get();
            }
        }
    }

    /**
     * 程序入口点
     * 调用语音翻译方法并处理可能的异常
     */
    public static void main(String[] args) {
        try {
            translationWithMicrophoneAsync();
        } catch (Exception ex) {
            System.out.println("Unexpected exception: " + ex.getMessage());
            assert(false);
            System.exit(1);
        }
    }



    public static void speechSynthesis(String text) {

        // Replace below with your own subscription key
        String speechSubscriptionKey = "C4w7owYrsgOu2ta7iOwDfNui4x95Rg0m80a0rpE39QTOuMcCKg70JQQJ99BCAC5RqLJXJ3w3AAAYACOGy4xL";
        // Replace below with your own endpoint URL (e.g., "https://westus.api.cognitive.microsoft.com")
        String endpointUrl = "https://westeurope.api.cognitive.microsoft.com";

        // Creates an instance of a speech synthesizer using speech configuration with
        // specified
        // endpoint and subscription key and default speaker as audio output.
        try (SpeechConfig config = SpeechConfig.fromEndpoint(new java.net.URI(endpointUrl), speechSubscriptionKey)) {
            // Set the voice name, refer to https://aka.ms/speech/voices/neural for full
            // list.
            config.setSpeechSynthesisVoiceName("en-US-AriaNeural");
            try (SpeechSynthesizer synth = new SpeechSynthesizer(config)) {

                assert (config != null);
                assert (synth != null);

                int exitCode = 1;

                System.out.println("Type some text that you want to speak...");
                System.out.print("> ");
//                String text = new Scanner(System.in).nextLine();

                Future<SpeechSynthesisResult> task = synth.SpeakTextAsync(text);
                assert (task != null);

                SpeechSynthesisResult result = task.get();
                assert (result != null);

                if (result.getReason() == ResultReason.SynthesizingAudioCompleted) {
                    System.out.println("Speech synthesized to speaker for text [" + text + "]");
                    exitCode = 0;
                } else if (result.getReason() == ResultReason.Canceled) {
                    SpeechSynthesisCancellationDetails cancellation = SpeechSynthesisCancellationDetails
                            .fromResult(result);
                    System.out.println("CANCELED: Reason=" + cancellation.getReason());

                    if (cancellation.getReason() == CancellationReason.Error) {
                        System.out.println("CANCELED: ErrorCode=" + cancellation.getErrorCode());
                        System.out.println("CANCELED: ErrorDetails=" + cancellation.getErrorDetails());
                        System.out.println("CANCELED: Did you update the subscription info?");
                    }
                }

                System.exit(exitCode);
            }
        } catch (Exception ex) {
            System.out.println("Unexpected exception: " + ex.getMessage());

            assert (false);
            System.exit(1);
        }
    }

}
// </code>
