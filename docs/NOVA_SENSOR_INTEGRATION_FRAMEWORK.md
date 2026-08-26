# NOVA Sensor Integration Framework — STEP 15

## 목적
NOVA가 특정 GPS/EPTS 또는 스마트워치 제조사에 종속되지 않도록
센서별 Adapter와 공통 데이터 형식을 분리한다.

## 현재 단계
실제 외부 서비스에 접근하지 않는다.
- Simulator 데이터로 UI/AI 로직을 테스트
- 승인/개발자 권한/사용자 동의가 필요한 Adapter는 placeholder
- 실제 선수 데이터 수집, API 우회, 크롤링 금지

## 구조
Sensor Device → Brand Adapter → NOVA Normalized Sensor Data
→ AI/Fatigue Engine → Dashboard/Alerts/Recommendations

## 테스트 데이터
GPS: distance, maxSpeed, sprintCount, highSpeedRunning, load
Wearable: heartRate, restingHeartRate, HRV, sleep, recoveryScore

## 향후
Fitogether/Garmin/Catapult/STATSports 등은 실제 권한과 API 조건 확인 후 연결.
Apple Health/Samsung Health/Garmin Watch/Polar/Fitbit은 공식 API/SDK와 사용자 권한 절차를 따른다.

## 기존 프로젝트 보호
이번 STEP 15는 기존 Dashboard, 테마, 언어, 공지사항, 피로도 UI를 교체하지 않는다.
새 파일만 추가한다.
