# NOVA V3 GPS Provider Framework

## 목적

GPS 장비마다 연결 방식이 다른 문제를 해결하기 위해 NOVA 내부에서는 하나의 표준 데이터/연결 인터페이스를 사용한다.

### 현재/예정 Provider

| Provider | 방식 | 상태 |
|---|---|---|
| Browser GPS | 모바일 브라우저 Geolocation | 현재 테스트/사용 가능 |
| Garmin Connect | 클라우드 API | 연동 준비 |
| Garmin Health SDK | 모바일 실시간 SDK | 연동 준비 |
| Catapult OpenField | OpenField Connect API | 연동 준비 |
| File Import | FIT/GPX/TCX/CSV 등 | 확장 예정 |

## 구조

```text
GPS Device / Platform
        ↓
Manufacturer Adapter
        ↓
NOVA GpsProvider
        ↓
표준 GpsSessionMetrics
        ↓
피로도 / 훈련부하 / 동작분석 / 운동추천
```

## 중요한 원칙

1. Camera AI 화면은 제조사별 API를 직접 호출하지 않는다.
2. 제조사별 인증/토큰은 서버에서 처리한다.
3. 각 제조사 어댑터는 동일한 NOVA 표준 데이터 구조로 변환한다.
4. GPS 데이터의 출처와 장비 모델을 저장한다.
5. 사용자 동의 및 접근권한을 적용한다.
6. API 토큰을 브라우저 코드에 저장하지 않는다.

## 실제 상용 연동

Garmin은 Connect Developer Program의 Activity API/Health API를 제공하며, 실시간 장치 데이터는 Health SDK를 통한 방식이 별도로 제공된다. 상용 사용에는 프로그램/라이선스 조건을 확인해야 한다.

Catapult OpenField는 API Token을 사용해 OpenField 데이터에 접근할 수 있으며, 계정에서 API Token 기능이 활성화되어야 한다.

따라서 '시중 모든 GPS 자동 연결'이 아니라 'NOVA가 지원하는 표준 어댑터를 통해 제조사별 연결' 방식으로 구현한다.

## 다음 실제 연동 순서

1. Browser GPS 검증
2. GPS 표준 데이터 저장
3. Garmin Connect OAuth/API 연동
4. Catapult OpenField API 연동
5. FIT/GPX/CSV 파일 가져오기
6. GPS → 피로도 통합
7. GPS + 동작분석 → 운동추천
