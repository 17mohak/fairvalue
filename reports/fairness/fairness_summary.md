# Fairness audit tables (generated, primary algorithm: hgb_tuned)

Residual = actual − predicted (+ = under-predicted). Gap = non-UEFA − UEFA. 95% CIs: stratified bootstrap.
Associations only; not evidence of discrimination. Interpretation: docs/reports/FAIRNESS_AUDIT.md.

## regression_log_scale

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_mean_residual_UEFA | -0.0188 | -0.0341 | -0.0028 |
| A_mean_residual_nonUEFA | 0.0780 | 0.0516 | 0.1043 |
| A_signed_gap_raw | 0.0968 | 0.0666 | 0.1264 |
| A_signed_gap_league_stratified | 0.0933 | 0.0629 | 0.1240 |
| A_mae_UEFA | 0.4029 | 0.3932 | 0.4128 |
| A_mae_nonUEFA | 0.4145 | 0.3982 | 0.4321 |
| A_mae_gap_raw | 0.0116 | -0.0074 | 0.0314 |
| A_mae_gap_league_stratified | 0.0115 | -0.0079 | 0.0313 |
| A_rmse_UEFA | 0.5239 | 0.5103 | 0.5373 |
| A_rmse_nonUEFA | 0.5301 | 0.5088 | 0.5535 |
| A_rmse_gap_raw | 0.0062 | -0.0191 | 0.0332 |
| B_mean_residual_UEFA | -0.0538 | -0.0752 | -0.0324 |
| B_mean_residual_nonUEFA | 0.1596 | 0.1233 | 0.1957 |
| B_signed_gap_raw | 0.2134 | 0.1705 | 0.2567 |
| B_signed_gap_league_stratified | 0.1644 | 0.1208 | 0.2068 |
| B_mae_UEFA | 0.7378 | 0.7227 | 0.7539 |
| B_mae_nonUEFA | 0.6893 | 0.6628 | 0.7151 |
| B_mae_gap_raw | -0.0485 | -0.0783 | -0.0182 |
| B_mae_gap_league_stratified | -0.0090 | -0.0389 | 0.0220 |
| B_rmse_UEFA | 0.9299 | 0.9105 | 0.9497 |
| B_rmse_nonUEFA | 0.8785 | 0.8453 | 0.9106 |
| B_rmse_gap_raw | -0.0514 | -0.0903 | -0.0127 |
| AminusB_signed_gap_raw | -0.1166 | -0.1467 | -0.0881 |
| AminusB_signed_gap_league_stratified | -0.0711 | -0.1018 | -0.0413 |
| AminusB_mae_gap_raw | 0.0601 | 0.0331 | 0.0888 |
| AminusB_mae_gap_league_stratified | 0.0205 | -0.0068 | 0.0489 |

## regression_eur_scale

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_mean_residual_UEFA | 682,864.3531 | 525,789.7330 | 841,063.5119 |
| A_mean_residual_nonUEFA | 1,068,672.4808 | 814,548.7139 | 1,323,875.3057 |
| A_signed_gap_raw | 385,808.1278 | 77,941.6696 | 679,669.3158 |
| A_signed_gap_league_stratified | 361,700.8031 | 15,292.7932 | 683,572.3670 |
| A_mae_UEFA | 2,253,631.2540 | 2,115,344.7425 | 2,400,067.9775 |
| A_mae_nonUEFA | 2,494,112.2377 | 2,278,674.7416 | 2,719,996.9392 |
| A_mae_gap_raw | 240,480.9837 | -21,891.0915 | 503,236.2614 |
| A_mae_gap_league_stratified | 76,620.8782 | -219,904.5133 | 368,590.2235 |
| A_rmse_UEFA | 5,585,791.4857 | 5,015,619.1996 | 6,191,779.3183 |
| A_rmse_nonUEFA | 5,204,075.0907 | 4,635,303.1224 | 5,758,971.4666 |
| A_rmse_gap_raw | -381,716.3951 | -1,209,736.0794 | 440,737.2293 |
| B_mean_residual_UEFA | 1,682,786.7570 | 1,471,391.3259 | 1,912,440.5472 |
| B_mean_residual_nonUEFA | 2,557,132.6221 | 2,184,790.2301 | 2,937,198.7211 |
| B_signed_gap_raw | 874,345.8651 | 437,938.7372 | 1,312,954.0584 |
| B_signed_gap_league_stratified | 781,332.3893 | 302,294.7369 | 1,242,014.0419 |
| B_mae_UEFA | 3,749,105.5143 | 3,545,700.5581 | 3,970,990.8152 |
| B_mae_nonUEFA | 4,016,278.5685 | 3,671,512.2005 | 4,368,566.0644 |
| B_mae_gap_raw | 267,173.0542 | -158,457.4944 | 663,233.9512 |
| B_mae_gap_league_stratified | 165,329.6172 | -293,651.8430 | 595,393.3816 |
| B_rmse_UEFA | 8,749,527.0695 | 7,992,289.6429 | 9,599,483.1570 |
| B_rmse_nonUEFA | 8,583,963.5586 | 7,577,538.6714 | 9,522,602.3257 |
| B_rmse_gap_raw | -165,563.5109 | -1,494,443.1872 | 1,058,310.4050 |
| AminusB_signed_gap_raw | -488,537.7374 | -794,388.2502 | -211,096.7356 |
| AminusB_signed_gap_league_stratified | -419,631.5862 | -732,977.1542 | -134,362.8157 |
| AminusB_mae_gap_raw | -26,692.0705 | -290,854.0378 | 220,864.3091 |
| AminusB_mae_gap_league_stratified | -88,708.7390 | -350,978.8405 | 162,621.8840 |

## tier_classifier

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_error_rate_UEFA | 0.2005 | 0.1883 | 0.2123 |
| A_under_tier_rate_UEFA | 0.1147 | 0.1052 | 0.1242 |
| A_over_tier_rate_UEFA | 0.0858 | 0.0777 | 0.0941 |
| A_error_rate_nonUEFA | 0.2253 | 0.2045 | 0.2480 |
| A_under_tier_rate_nonUEFA | 0.1477 | 0.1303 | 0.1664 |
| A_over_tier_rate_nonUEFA | 0.0775 | 0.0648 | 0.0909 |
| A_ER1a_error_rate_gap | 0.0248 | 0.0007 | 0.0488 |
| A_under_tier_gap | 0.0330 | 0.0131 | 0.0543 |
| A_over_tier_gap | -0.0083 | -0.0240 | 0.0082 |
| A_Emerging_tpr_UEFA | 0.9027 | 0.8907 | 0.9145 |
| A_Emerging_fpr_UEFA | 0.1048 | 0.0922 | 0.1171 |
| A_Emerging_selection_rate_UEFA | 0.5032 | 0.4910 | 0.5157 |
| A_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| A_Emerging_tpr_nonUEFA | 0.8898 | 0.8653 | 0.9136 |
| A_Emerging_fpr_nonUEFA | 0.1104 | 0.0906 | 0.1309 |
| A_Emerging_selection_rate_nonUEFA | 0.4318 | 0.4098 | 0.4532 |
| A_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| A_Emerging_tpr_gap | -0.0129 | -0.0420 | 0.0139 |
| A_Emerging_fpr_gap | 0.0055 | -0.0174 | 0.0304 |
| A_Emerging_EOD | 0.0129 | 0.0038 | 0.0424 |
| A_Emerging_selection_rate_gap | -0.0714 | -0.0965 | -0.0467 |
| A_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| A_Established_tpr_UEFA | 0.7403 | 0.7163 | 0.7637 |
| A_Established_fpr_UEFA | 0.1284 | 0.1169 | 0.1403 |
| A_Established_selection_rate_UEFA | 0.3148 | 0.3013 | 0.3279 |
| A_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| A_Established_tpr_nonUEFA | 0.7607 | 0.7239 | 0.7956 |
| A_Established_fpr_nonUEFA | 0.1609 | 0.1380 | 0.1840 |
| A_Established_selection_rate_nonUEFA | 0.3770 | 0.3529 | 0.4011 |
| A_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| A_Established_tpr_gap | 0.0203 | -0.0233 | 0.0611 |
| A_Established_fpr_gap | 0.0326 | 0.0064 | 0.0592 |
| A_Established_EOD | 0.0326 | 0.0138 | 0.0644 |
| A_Established_selection_rate_gap | 0.0623 | 0.0358 | 0.0902 |
| A_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| A_Elite_tpr_UEFA | 0.6248 | 0.5858 | 0.6637 |
| A_Elite_fpr_UEFA | 0.0555 | 0.0482 | 0.0624 |
| A_Elite_selection_rate_UEFA | 0.1341 | 0.1251 | 0.1434 |
| A_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| A_Elite_tpr_nonUEFA | 0.5894 | 0.5273 | 0.6488 |
| A_Elite_fpr_nonUEFA | 0.0568 | 0.0443 | 0.0695 |
| A_Elite_selection_rate_nonUEFA | 0.1444 | 0.1283 | 0.1611 |
| A_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| A_Elite_tpr_gap | -0.0354 | -0.1126 | 0.0374 |
| A_Elite_fpr_gap | 0.0013 | -0.0133 | 0.0155 |
| A_Elite_EOD | 0.0354 | 0.0048 | 0.1126 |
| A_Elite_selection_rate_gap | 0.0102 | -0.0096 | 0.0303 |
| A_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| A_World Class_tpr_UEFA | 0.6375 | 0.5774 | 0.6996 |
| A_World Class_fpr_UEFA | 0.0115 | 0.0081 | 0.0150 |
| A_World Class_selection_rate_UEFA | 0.0479 | 0.0419 | 0.0539 |
| A_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| A_World Class_tpr_nonUEFA | 0.5851 | 0.4805 | 0.6813 |
| A_World Class_fpr_nonUEFA | 0.0107 | 0.0057 | 0.0164 |
| A_World Class_selection_rate_nonUEFA | 0.0468 | 0.0368 | 0.0568 |
| A_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| A_World Class_tpr_gap | -0.0523 | -0.1702 | 0.0577 |
| A_World Class_fpr_gap | -0.0008 | -0.0068 | 0.0059 |
| A_World Class_EOD | 0.0523 | 0.0038 | 0.1702 |
| A_World Class_selection_rate_gap | -0.0011 | -0.0124 | 0.0106 |
| A_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| A_ER1b_max_EOD | 0.0523 | 0.0276 | 0.1705 |
| B_error_rate_UEFA | 0.3330 | 0.3194 | 0.3464 |
| B_under_tier_rate_UEFA | 0.2028 | 0.1917 | 0.2139 |
| B_over_tier_rate_UEFA | 0.1302 | 0.1203 | 0.1404 |
| B_error_rate_nonUEFA | 0.3422 | 0.3182 | 0.3656 |
| B_under_tier_rate_nonUEFA | 0.2447 | 0.2239 | 0.2667 |
| B_over_tier_rate_nonUEFA | 0.0976 | 0.0829 | 0.1116 |
| B_ER1a_error_rate_gap | 0.0092 | -0.0178 | 0.0352 |
| B_under_tier_gap | 0.0418 | 0.0179 | 0.0648 |
| B_over_tier_gap | -0.0326 | -0.0497 | -0.0156 |
| B_Emerging_tpr_UEFA | 0.8365 | 0.8204 | 0.8524 |
| B_Emerging_fpr_UEFA | 0.2319 | 0.2141 | 0.2493 |
| B_Emerging_selection_rate_UEFA | 0.5338 | 0.5208 | 0.5476 |
| B_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| B_Emerging_tpr_nonUEFA | 0.8347 | 0.8049 | 0.8642 |
| B_Emerging_fpr_nonUEFA | 0.2446 | 0.2173 | 0.2734 |
| B_Emerging_selection_rate_nonUEFA | 0.4880 | 0.4639 | 0.5127 |
| B_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| B_Emerging_tpr_gap | -0.0018 | -0.0345 | 0.0304 |
| B_Emerging_fpr_gap | 0.0127 | -0.0187 | 0.0455 |
| B_Emerging_EOD | 0.0127 | 0.0039 | 0.0480 |
| B_Emerging_selection_rate_gap | -0.0458 | -0.0746 | -0.0184 |
| B_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| B_Established_tpr_UEFA | 0.5520 | 0.5238 | 0.5785 |
| B_Established_fpr_UEFA | 0.1999 | 0.1857 | 0.2137 |
| B_Established_selection_rate_UEFA | 0.3071 | 0.2932 | 0.3203 |
| B_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| B_Established_tpr_nonUEFA | 0.5918 | 0.5514 | 0.6334 |
| B_Established_fpr_nonUEFA | 0.2226 | 0.1966 | 0.2492 |
| B_Established_selection_rate_nonUEFA | 0.3556 | 0.3322 | 0.3797 |
| B_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| B_Established_tpr_gap | 0.0398 | -0.0082 | 0.0889 |
| B_Established_fpr_gap | 0.0227 | -0.0067 | 0.0520 |
| B_Established_EOD | 0.0398 | 0.0113 | 0.0889 |
| B_Established_selection_rate_gap | 0.0485 | 0.0218 | 0.0767 |
| B_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| B_Elite_tpr_UEFA | 0.3903 | 0.3515 | 0.4320 |
| B_Elite_fpr_UEFA | 0.0732 | 0.0656 | 0.0818 |
| B_Elite_selection_rate_UEFA | 0.1170 | 0.1080 | 0.1265 |
| B_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| B_Elite_tpr_nonUEFA | 0.4268 | 0.3668 | 0.4895 |
| B_Elite_fpr_nonUEFA | 0.0536 | 0.0410 | 0.0665 |
| B_Elite_selection_rate_nonUEFA | 0.1150 | 0.1003 | 0.1310 |
| B_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| B_Elite_tpr_gap | 0.0365 | -0.0357 | 0.1086 |
| B_Elite_fpr_gap | -0.0196 | -0.0348 | -0.0051 |
| B_Elite_EOD | 0.0365 | 0.0127 | 0.1086 |
| B_Elite_selection_rate_gap | -0.0020 | -0.0205 | 0.0172 |
| B_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| B_World Class_tpr_UEFA | 0.4701 | 0.4056 | 0.5292 |
| B_World Class_fpr_UEFA | 0.0157 | 0.0120 | 0.0196 |
| B_World Class_selection_rate_UEFA | 0.0421 | 0.0361 | 0.0479 |
| B_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| B_World Class_tpr_nonUEFA | 0.4787 | 0.3765 | 0.5778 |
| B_World Class_fpr_nonUEFA | 0.0121 | 0.0071 | 0.0179 |
| B_World Class_selection_rate_nonUEFA | 0.0414 | 0.0321 | 0.0515 |
| B_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| B_World Class_tpr_gap | 0.0086 | -0.1027 | 0.1304 |
| B_World Class_fpr_gap | -0.0036 | -0.0102 | 0.0037 |
| B_World Class_EOD | 0.0086 | 0.0039 | 0.1380 |
| B_World Class_selection_rate_gap | -0.0006 | -0.0120 | 0.0106 |
| B_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| B_ER1b_max_EOD | 0.0398 | 0.0316 | 0.1405 |
| AminusB_ER1a_error_rate_gap | 0.0155 | -0.0116 | 0.0453 |
| AminusB_ER1b_max_EOD | 0.0125 | -0.0798 | 0.1035 |
| AminusB_under_tier_gap | -0.0088 | -0.0291 | 0.0120 |
| AminusB_over_tier_gap | 0.0243 | 0.0064 | 0.0443 |

## tier_from_regression

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_error_rate_UEFA | 0.1792 | 0.1681 | 0.1899 |
| A_under_tier_rate_UEFA | 0.1198 | 0.1101 | 0.1297 |
| A_over_tier_rate_UEFA | 0.0594 | 0.0530 | 0.0666 |
| A_error_rate_nonUEFA | 0.2186 | 0.1985 | 0.2400 |
| A_under_tier_rate_nonUEFA | 0.1631 | 0.1444 | 0.1818 |
| A_over_tier_rate_nonUEFA | 0.0555 | 0.0448 | 0.0675 |
| A_ER1a_error_rate_gap | 0.0394 | 0.0159 | 0.0630 |
| A_under_tier_gap | 0.0433 | 0.0225 | 0.0642 |
| A_over_tier_gap | -0.0040 | -0.0163 | 0.0099 |
| A_Emerging_tpr_UEFA | 0.9250 | 0.9146 | 0.9357 |
| A_Emerging_fpr_UEFA | 0.1141 | 0.1009 | 0.1268 |
| A_Emerging_selection_rate_UEFA | 0.5190 | 0.5076 | 0.5310 |
| A_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| A_Emerging_tpr_nonUEFA | 0.9141 | 0.8924 | 0.9343 |
| A_Emerging_fpr_nonUEFA | 0.1342 | 0.1124 | 0.1554 |
| A_Emerging_selection_rate_nonUEFA | 0.4559 | 0.4332 | 0.4766 |
| A_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| A_Emerging_tpr_gap | -0.0109 | -0.0353 | 0.0126 |
| A_Emerging_fpr_gap | 0.0202 | -0.0065 | 0.0458 |
| A_Emerging_EOD | 0.0202 | 0.0062 | 0.0468 |
| A_Emerging_selection_rate_gap | -0.0631 | -0.0890 | -0.0377 |
| A_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| A_Established_tpr_UEFA | 0.7646 | 0.7420 | 0.7874 |
| A_Established_fpr_UEFA | 0.1157 | 0.1048 | 0.1269 |
| A_Established_selection_rate_UEFA | 0.3134 | 0.3000 | 0.3263 |
| A_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| A_Established_tpr_nonUEFA | 0.7440 | 0.7074 | 0.7810 |
| A_Established_fpr_nonUEFA | 0.1546 | 0.1321 | 0.1771 |
| A_Established_selection_rate_nonUEFA | 0.3670 | 0.3443 | 0.3910 |
| A_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| A_Established_tpr_gap | -0.0206 | -0.0642 | 0.0247 |
| A_Established_fpr_gap | 0.0389 | 0.0131 | 0.0635 |
| A_Established_EOD | 0.0389 | 0.0194 | 0.0686 |
| A_Established_selection_rate_gap | 0.0536 | 0.0266 | 0.0809 |
| A_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| A_Elite_tpr_UEFA | 0.6415 | 0.6026 | 0.6815 |
| A_Elite_fpr_UEFA | 0.0400 | 0.0336 | 0.0464 |
| A_Elite_selection_rate_UEFA | 0.1230 | 0.1142 | 0.1323 |
| A_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| A_Elite_tpr_nonUEFA | 0.5732 | 0.5114 | 0.6379 |
| A_Elite_fpr_nonUEFA | 0.0408 | 0.0298 | 0.0518 |
| A_Elite_selection_rate_nonUEFA | 0.1283 | 0.1130 | 0.1451 |
| A_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| A_Elite_tpr_gap | -0.0684 | -0.1398 | 0.0057 |
| A_Elite_fpr_gap | 0.0008 | -0.0115 | 0.0132 |
| A_Elite_EOD | 0.0684 | 0.0072 | 0.1398 |
| A_Elite_selection_rate_gap | 0.0053 | -0.0131 | 0.0244 |
| A_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| A_World Class_tpr_UEFA | 0.6454 | 0.5861 | 0.7037 |
| A_World Class_fpr_UEFA | 0.0076 | 0.0051 | 0.0103 |
| A_World Class_selection_rate_UEFA | 0.0446 | 0.0391 | 0.0506 |
| A_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| A_World Class_tpr_nonUEFA | 0.6702 | 0.5773 | 0.7596 |
| A_World Class_fpr_nonUEFA | 0.0071 | 0.0029 | 0.0115 |
| A_World Class_selection_rate_nonUEFA | 0.0488 | 0.0388 | 0.0595 |
| A_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| A_World Class_tpr_gap | 0.0248 | -0.0844 | 0.1299 |
| A_World Class_fpr_gap | -0.0005 | -0.0055 | 0.0046 |
| A_World Class_EOD | 0.0248 | 0.0025 | 0.1314 |
| A_World Class_selection_rate_gap | 0.0042 | -0.0080 | 0.0156 |
| A_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| A_ER1b_max_EOD | 0.0684 | 0.0317 | 0.1510 |
| B_error_rate_UEFA | 0.3228 | 0.3092 | 0.3353 |
| B_under_tier_rate_UEFA | 0.2139 | 0.2028 | 0.2243 |
| B_over_tier_rate_UEFA | 0.1089 | 0.1004 | 0.1177 |
| B_error_rate_nonUEFA | 0.3476 | 0.3255 | 0.3697 |
| B_under_tier_rate_nonUEFA | 0.2647 | 0.2460 | 0.2854 |
| B_over_tier_rate_nonUEFA | 0.0829 | 0.0695 | 0.0969 |
| B_ER1a_error_rate_gap | 0.0247 | -0.0011 | 0.0504 |
| B_under_tier_gap | 0.0508 | 0.0292 | 0.0734 |
| B_over_tier_gap | -0.0260 | -0.0423 | -0.0100 |
| B_Emerging_tpr_UEFA | 0.8374 | 0.8215 | 0.8532 |
| B_Emerging_fpr_UEFA | 0.2180 | 0.2006 | 0.2348 |
| B_Emerging_selection_rate_UEFA | 0.5273 | 0.5136 | 0.5407 |
| B_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| B_Emerging_tpr_nonUEFA | 0.8395 | 0.8114 | 0.8669 |
| B_Emerging_fpr_nonUEFA | 0.2275 | 0.2016 | 0.2557 |
| B_Emerging_selection_rate_nonUEFA | 0.4799 | 0.4572 | 0.5047 |
| B_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| B_Emerging_tpr_gap | 0.0021 | -0.0298 | 0.0345 |
| B_Emerging_fpr_gap | 0.0095 | -0.0217 | 0.0424 |
| B_Emerging_EOD | 0.0095 | 0.0038 | 0.0449 |
| B_Emerging_selection_rate_gap | -0.0473 | -0.0747 | -0.0188 |
| B_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| B_Established_tpr_UEFA | 0.6014 | 0.5742 | 0.6274 |
| B_Established_fpr_UEFA | 0.2258 | 0.2111 | 0.2404 |
| B_Established_selection_rate_UEFA | 0.3402 | 0.3263 | 0.3541 |
| B_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| B_Established_tpr_nonUEFA | 0.6271 | 0.5868 | 0.6667 |
| B_Established_fpr_nonUEFA | 0.2550 | 0.2280 | 0.2810 |
| B_Established_selection_rate_nonUEFA | 0.3890 | 0.3656 | 0.4131 |
| B_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| B_Established_tpr_gap | 0.0257 | -0.0231 | 0.0749 |
| B_Established_fpr_gap | 0.0292 | -0.0014 | 0.0590 |
| B_Established_EOD | 0.0292 | 0.0117 | 0.0761 |
| B_Established_selection_rate_gap | 0.0488 | 0.0216 | 0.0768 |
| B_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| B_Elite_tpr_UEFA | 0.3769 | 0.3371 | 0.4172 |
| B_Elite_fpr_UEFA | 0.0590 | 0.0518 | 0.0665 |
| B_Elite_selection_rate_UEFA | 0.1029 | 0.0944 | 0.1117 |
| B_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| B_Elite_tpr_nonUEFA | 0.3577 | 0.3000 | 0.4183 |
| B_Elite_fpr_nonUEFA | 0.0576 | 0.0452 | 0.0703 |
| B_Elite_selection_rate_nonUEFA | 0.1070 | 0.0922 | 0.1223 |
| B_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| B_Elite_tpr_gap | -0.0192 | -0.0854 | 0.0556 |
| B_Elite_fpr_gap | -0.0014 | -0.0157 | 0.0137 |
| B_Elite_EOD | 0.0192 | 0.0038 | 0.0861 |
| B_Elite_selection_rate_gap | 0.0040 | -0.0137 | 0.0217 |
| B_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| B_World Class_tpr_UEFA | 0.4104 | 0.3525 | 0.4697 |
| B_World Class_fpr_UEFA | 0.0061 | 0.0039 | 0.0086 |
| B_World Class_selection_rate_UEFA | 0.0296 | 0.0247 | 0.0345 |
| B_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| B_World Class_tpr_nonUEFA | 0.3404 | 0.2473 | 0.4393 |
| B_World Class_fpr_nonUEFA | 0.0029 | 0.0007 | 0.0058 |
| B_World Class_selection_rate_nonUEFA | 0.0241 | 0.0167 | 0.0321 |
| B_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| B_World Class_tpr_gap | -0.0699 | -0.1818 | 0.0434 |
| B_World Class_fpr_gap | -0.0033 | -0.0067 | 0.0005 |
| B_World Class_EOD | 0.0699 | 0.0042 | 0.1818 |
| B_World Class_selection_rate_gap | -0.0055 | -0.0149 | 0.0035 |
| B_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| B_ER1b_max_EOD | 0.0699 | 0.0294 | 0.1818 |
| AminusB_ER1a_error_rate_gap | 0.0146 | -0.0119 | 0.0424 |
| AminusB_ER1b_max_EOD | -0.0016 | -0.1127 | 0.0888 |
| AminusB_under_tier_gap | -0.0075 | -0.0282 | 0.0131 |
| AminusB_over_tier_gap | 0.0221 | 0.0054 | 0.0399 |

## strata_signed_log_gap

| stratum | n_nonUEFA | n_UEFA | flag | dropped_nonUEFA_share | A_signed_log_gap | A_ci95_low | A_ci95_high | B_signed_log_gap | B_ci95_low | B_ci95_high |
|---|---|---|---|---|---|---|---|---|---|---|
| all players | 1496 | 4324 |  | 0.0000 | 0.0933 | 0.0629 | 0.1240 | 0.1644 | 0.1226 | 0.2065 |
| minutes >= 900 (sensitivity) | 1331 | 3797 |  | 0.0000 | 0.0837 | 0.0524 | 0.1142 | 0.1559 | 0.1131 | 0.1986 |
| recent arrivals | 410 | 790 |  | 0.0000 | 0.1176 | 0.0490 | 0.1855 | 0.1740 | 0.0886 | 0.2664 |
| established (not recent arrivals) | 1086 | 3534 |  | 0.0000 | 0.0801 | 0.0458 | 0.1175 | 0.1388 | 0.0901 | 0.1871 |
| CAF vs UEFA | 675 | 4324 |  | 0.0000 | 0.0835 | 0.0435 | 0.1250 | 0.1319 | 0.0721 | 0.1931 |
| CONMEBOL vs UEFA | 533 | 4324 |  | 0.0000 | 0.1184 | 0.0696 | 0.1654 | 0.1903 | 0.1233 | 0.2592 |
| diaspora-born non-UEFA vs UEFA | 376 | 4324 |  | 0.0000 | 0.0712 | 0.0141 | 0.1206 | 0.1050 | 0.0316 | 0.1834 |
| other non-UEFA vs UEFA | 1120 | 4324 |  | 0.0000 | 0.1007 | 0.0655 | 0.1353 | 0.1843 | 0.1360 | 0.2318 |
| non-UEFA vs EU-mobile UEFA (exploratory) | 1496 | 3300 |  | 0.0000 | 0.0690 | 0.0326 | 0.1090 | 0.1461 | 0.0932 | 0.2013 |
| non-UEFA vs other UEFA (exploratory) | 1496 | 1024 |  | 0.0000 | 0.0538 | -0.0282 | 0.1342 | 0.0708 | -0.0224 | 0.1642 |
| position: Attack | 532 | 1051 |  | 0.0000 | 0.0921 | 0.0352 | 0.1510 | 0.1896 | 0.1139 | 0.2621 |
| position: Midfield | 395 | 1292 |  | 0.0000 | 0.0785 | 0.0224 | 0.1349 | 0.1497 | 0.0692 | 0.2343 |
| position: Defender | 508 | 1557 |  | 0.0000 | 0.0983 | 0.0465 | 0.1539 | 0.1674 | 0.0931 | 0.2412 |
| position: Goalkeeper | 61 | 424 |  | 0.0000 | 0.1299 | -0.0156 | 0.2834 | 0.0524 | -0.1187 | 0.2267 |

## league_signed_log_gap

| league | n_nonUEFA | n_UEFA | reporting | A_signed_log_gap | A_ci95_low | A_ci95_high | A_mae_UEFA | A_mae_nonUEFA | B_signed_log_gap | B_ci95_low | B_ci95_high | B_mae_UEFA | B_mae_nonUEFA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PO1 | 178 | 245 | league-level estimate | -0.0169 | -0.1197 | 0.0821 | 0.4052 | 0.4397 | -0.1025 | -0.2262 | 0.0249 | 0.5535 | 0.5930 |
| FR1 | 177 | 246 | league-level estimate | 0.0379 | -0.0557 | 0.1326 | 0.3935 | 0.4048 | 0.0405 | -0.0853 | 0.1764 | 0.6624 | 0.7015 |
| GB1 | 135 | 420 | league-level estimate | 0.0349 | -0.0628 | 0.1316 | 0.3885 | 0.3745 | 0.0587 | -0.1119 | 0.2252 | 1.0277 | 1.0409 |
| TR1 | 127 | 301 | league-level estimate | 0.2565 | 0.1393 | 0.3753 | 0.4836 | 0.4384 | 0.3769 | 0.2279 | 0.5267 | 0.6630 | 0.5702 |
| ES1 | 123 | 386 | league-level estimate | 0.0713 | -0.0348 | 0.1773 | 0.4142 | 0.4308 | 0.1353 | -0.0106 | 0.2763 | 0.5814 | 0.6349 |
| IT1 | 112 | 395 | league-level estimate | 0.0104 | -0.0955 | 0.1121 | 0.3891 | 0.4059 | 0.1412 | -0.0055 | 0.2884 | 0.6765 | 0.7564 |
| BE1 | 108 | 242 | league-level estimate | 0.1304 | 0.0258 | 0.2381 | 0.3676 | 0.3830 | 0.1669 | 0.0252 | 0.3133 | 0.5553 | 0.4952 |
| RU1 | 108 | 304 | league-level estimate | 0.2643 | 0.1474 | 0.3840 | 0.3854 | 0.4267 | 0.5467 | 0.3829 | 0.7174 | 0.5377 | 0.6593 |
| GR1 | 93 | 263 | pooled only (n < 100) | 0.2372 | 0.1141 | 0.3617 | 0.3684 | 0.4459 | 0.2523 | 0.0970 | 0.4150 | 0.5432 | 0.5674 |
| NL1 | 83 | 342 | pooled only (n < 100) | 0.0753 | -0.0344 | 0.1833 | 0.4149 | 0.3566 | 0.2085 | 0.0380 | 0.3882 | 0.8287 | 0.6796 |
| L1 | 80 | 371 | pooled only (n < 100) | 0.0031 | -0.1099 | 0.1130 | 0.3662 | 0.3509 | 0.0111 | -0.1473 | 0.1727 | 0.7498 | 0.7305 |
| UKR1 | 69 | 345 | pooled only (n < 100) | 0.1575 | 0.0366 | 0.2694 | 0.3241 | 0.3584 | 0.3872 | 0.2129 | 0.5627 | 1.0616 | 0.7587 |
| SC1 | 55 | 256 | pooled only (n < 100) | 0.1149 | -0.0769 | 0.3043 | 0.5535 | 0.5597 | 0.3935 | 0.1116 | 0.6893 | 1.0629 | 0.9906 |
| DK1 | 48 | 208 | pooled only (n < 100) | 0.0053 | -0.1925 | 0.1980 | 0.4307 | 0.4874 | 0.0352 | -0.1760 | 0.2417 | 0.6164 | 0.5527 |

## worst_errors

| model | set | n | nonUEFA_share_in_set | nonUEFA_share_overall |
|---|---|---|---|---|
| Model A | largest under-predictions (top 5%) | 291 | 0.3574 | 0.2570 |
| Model A | largest over-predictions (top 5%) | 291 | 0.2096 | 0.2570 |
| Model A | largest absolute errors (top 5%) | 291 | 0.2405 | 0.2570 |
| Model B | largest under-predictions (top 5%) | 291 | 0.3196 | 0.2570 |
| Model B | largest over-predictions (top 5%) | 291 | 0.1443 | 0.2570 |
| Model B | largest absolute errors (top 5%) | 291 | 0.2302 | 0.2570 |

## calibration_within_predicted_deciles

| model | predicted_decile | n_nonUEFA | n_UEFA | mean_res_UEFA | mean_res_nonUEFA | gap | ci95_low | ci95_high | dropped_nonUEFA_share |
|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 92.0000 | 490.0000 | 0.0047 | 0.0652 | 0.0605 |  |  |  |
| A | 2 | 142.0000 | 440.0000 | -0.0249 | 0.1487 | 0.1736 |  |  |  |
| A | 3 | 121.0000 | 461.0000 | -0.0950 | 0.0402 | 0.1352 |  |  |  |
| A | 4 | 142.0000 | 440.0000 | -0.0174 | 0.0150 | 0.0324 |  |  |  |
| A | 5 | 177.0000 | 405.0000 | -0.0237 | 0.0831 | 0.1067 |  |  |  |
| A | 6 | 160.0000 | 422.0000 | -0.0535 | 0.0530 | 0.1064 |  |  |  |
| A | 7 | 183.0000 | 399.0000 | -0.0242 | 0.1080 | 0.1322 |  |  |  |
| A | 8 | 158.0000 | 424.0000 | -0.0325 | 0.1008 | 0.1333 |  |  |  |
| A | 9 | 167.0000 | 415.0000 | 0.0769 | 0.1065 | 0.0296 |  |  |  |
| A | 10 | 154.0000 | 428.0000 | 0.0057 | 0.0384 | 0.0327 |  |  |  |
| A | ALL: stratified by predicted decile |  |  |  |  | 0.0951 | 0.0657 | 0.1247 | 0.0000 |
| A | ALL: stratified by league x predicted decile |  |  |  |  | 0.1008 | 0.0704 | 0.1309 | 0.0027 |
| B | 1 | 121.0000 | 461.0000 | -0.0211 | 0.1434 | 0.1644 |  |  |  |
| B | 2 | 127.0000 | 455.0000 | -0.0701 | 0.2082 | 0.2783 |  |  |  |
| B | 3 | 150.0000 | 432.0000 | -0.1492 | 0.1529 | 0.3021 |  |  |  |
| B | 4 | 160.0000 | 422.0000 | -0.0718 | 0.2416 | 0.3133 |  |  |  |
| B | 5 | 140.0000 | 442.0000 | -0.1131 | 0.1194 | 0.2325 |  |  |  |
| B | 6 | 148.0000 | 434.0000 | -0.0231 | 0.1474 | 0.1705 |  |  |  |
| B | 7 | 172.0000 | 410.0000 | -0.0335 | 0.0974 | 0.1310 |  |  |  |
| B | 8 | 172.0000 | 410.0000 | -0.0839 | 0.1717 | 0.2556 |  |  |  |
| B | 9 | 162.0000 | 420.0000 | -0.0023 | 0.1691 | 0.1714 |  |  |  |
| B | 10 | 144.0000 | 438.0000 | 0.0297 | 0.1475 | 0.1178 |  |  |  |
| B | ALL: stratified by predicted decile |  |  |  |  | 0.2137 | 0.1757 | 0.2537 | 0.0000 |
| B | ALL: stratified by league x predicted decile |  |  |  |  | 0.1712 | 0.1312 | 0.2130 | 0.0000 |

## robustness_all_algorithms

| algorithm | model | signed_gap_raw | signed_gap_league_stratified | mae_gap_raw | rmse_UEFA | rmse_nonUEFA |
|---|---|---|---|---|---|---|
| ridge | A | 0.1338 | 0.1320 | 0.0078 | 0.6028 | 0.6069 |
| ridge | B | 0.2637 | 0.1999 | -0.0538 | 1.0399 | 0.9849 |
| random_forest | A | 0.1584 | 0.1340 | -0.0137 | 0.6512 | 0.6307 |
| random_forest | B | 0.2297 | 0.1672 | -0.0592 | 1.0008 | 0.9407 |
| hgb | A | 0.1107 | 0.1059 | 0.0091 | 0.5376 | 0.5444 |
| hgb | B | 0.2130 | 0.1668 | -0.0585 | 0.9378 | 0.8763 |
| hgb_tuned | A | 0.0968 | 0.0933 | 0.0116 | 0.5239 | 0.5301 |
| hgb_tuned | B | 0.2134 | 0.1644 | -0.0485 | 0.9299 | 0.8785 |
