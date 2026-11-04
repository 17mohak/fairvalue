# Fairness audit tables (generated, primary algorithm: hgb_tuned)

Residual = actual − predicted (+ = under-predicted). Gap = non-UEFA − UEFA. 95% CIs: stratified bootstrap.
Associations only; not evidence of discrimination. Interpretation: docs/reports/FAIRNESS_AUDIT.md.

## regression_log_scale

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_mean_residual_UEFA | -0.0219 | -0.0371 | -0.0058 |
| A_mean_residual_nonUEFA | 0.0808 | 0.0541 | 0.1071 |
| A_signed_gap_raw | 0.1027 | 0.0721 | 0.1322 |
| A_signed_gap_league_stratified | 0.0986 | 0.0676 | 0.1284 |
| A_mae_UEFA | 0.4049 | 0.3950 | 0.4149 |
| A_mae_nonUEFA | 0.4170 | 0.4006 | 0.4353 |
| A_mae_gap_raw | 0.0121 | -0.0070 | 0.0325 |
| A_mae_gap_league_stratified | 0.0102 | -0.0092 | 0.0309 |
| A_rmse_UEFA | 0.5266 | 0.5130 | 0.5407 |
| A_rmse_nonUEFA | 0.5345 | 0.5130 | 0.5589 |
| A_rmse_gap_raw | 0.0079 | -0.0173 | 0.0361 |
| B_mean_residual_UEFA | -0.0501 | -0.0713 | -0.0284 |
| B_mean_residual_nonUEFA | 0.1554 | 0.1185 | 0.1921 |
| B_signed_gap_raw | 0.2055 | 0.1631 | 0.2486 |
| B_signed_gap_league_stratified | 0.1590 | 0.1155 | 0.2007 |
| B_mae_UEFA | 0.7405 | 0.7255 | 0.7575 |
| B_mae_nonUEFA | 0.6863 | 0.6594 | 0.7116 |
| B_mae_gap_raw | -0.0543 | -0.0848 | -0.0247 |
| B_mae_gap_league_stratified | -0.0135 | -0.0439 | 0.0177 |
| B_rmse_UEFA | 0.9336 | 0.9140 | 0.9534 |
| B_rmse_nonUEFA | 0.8741 | 0.8408 | 0.9063 |
| B_rmse_gap_raw | -0.0594 | -0.0989 | -0.0216 |
| AminusB_signed_gap_raw | -0.1028 | -0.1318 | -0.0745 |
| AminusB_signed_gap_league_stratified | -0.0604 | -0.0892 | -0.0318 |
| AminusB_mae_gap_raw | 0.0664 | 0.0392 | 0.0948 |
| AminusB_mae_gap_league_stratified | 0.0236 | -0.0042 | 0.0515 |

## regression_eur_scale

| metric | estimate | ci95_low | ci95_high |
|---|---|---|---|
| A_mean_residual_UEFA | 722,817.8987 | 562,687.0372 | 883,923.4769 |
| A_mean_residual_nonUEFA | 1,142,655.3654 | 881,641.4860 | 1,406,944.9153 |
| A_signed_gap_raw | 419,837.4667 | 103,583.1365 | 715,813.4182 |
| A_signed_gap_league_stratified | 407,827.6161 | 68,070.1537 | 740,231.5397 |
| A_mae_UEFA | 2,280,811.1703 | 2,140,675.7691 | 2,428,821.2490 |
| A_mae_nonUEFA | 2,547,492.6548 | 2,314,998.7697 | 2,796,209.1562 |
| A_mae_gap_raw | 266,681.4844 | -2,484.3764 | 529,651.6605 |
| A_mae_gap_league_stratified | 99,552.7541 | -199,131.9590 | 396,004.8115 |
| A_rmse_UEFA | 5,636,939.9941 | 5,039,107.7327 | 6,271,213.5603 |
| A_rmse_nonUEFA | 5,454,042.1126 | 4,787,104.3324 | 6,092,480.4525 |
| A_rmse_gap_raw | -182,897.8815 | -1,072,655.8165 | 675,690.6912 |
| B_mean_residual_UEFA | 1,704,126.6252 | 1,492,233.2924 | 1,932,783.0688 |
| B_mean_residual_nonUEFA | 2,531,591.3637 | 2,160,708.7554 | 2,904,577.9199 |
| B_signed_gap_raw | 827,464.7386 | 402,393.2888 | 1,261,825.7857 |
| B_signed_gap_league_stratified | 755,221.0307 | 293,280.8393 | 1,212,398.4636 |
| B_mae_UEFA | 3,751,931.3428 | 3,549,646.0556 | 3,975,088.6104 |
| B_mae_nonUEFA | 3,987,723.7580 | 3,648,787.7766 | 4,349,351.2406 |
| B_mae_gap_raw | 235,792.4152 | -188,075.0035 | 632,471.4256 |
| B_mae_gap_league_stratified | 136,488.9714 | -317,034.1636 | 561,727.7069 |
| B_rmse_UEFA | 8,713,549.1966 | 7,961,372.4587 | 9,543,717.1915 |
| B_rmse_nonUEFA | 8,506,362.9635 | 7,502,163.3268 | 9,457,796.5751 |
| B_rmse_gap_raw | -207,186.2332 | -1,520,913.2020 | 1,002,753.6558 |
| AminusB_signed_gap_raw | -407,627.2719 | -687,442.7426 | -135,749.9058 |
| AminusB_signed_gap_league_stratified | -347,393.4147 | -635,613.6216 | -71,745.8780 |
| AminusB_mae_gap_raw | 30,889.0693 | -218,381.8417 | 258,708.5927 |
| AminusB_mae_gap_league_stratified | -36,936.2173 | -290,617.8745 | 198,713.1590 |

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
| A_error_rate_UEFA | 0.1783 | 0.1674 | 0.1892 |
| A_under_tier_rate_UEFA | 0.1205 | 0.1112 | 0.1304 |
| A_over_tier_rate_UEFA | 0.0578 | 0.0511 | 0.0645 |
| A_error_rate_nonUEFA | 0.2139 | 0.1932 | 0.2346 |
| A_under_tier_rate_nonUEFA | 0.1604 | 0.1417 | 0.1791 |
| A_over_tier_rate_nonUEFA | 0.0535 | 0.0434 | 0.0648 |
| A_ER1a_error_rate_gap | 0.0356 | 0.0118 | 0.0589 |
| A_under_tier_gap | 0.0399 | 0.0197 | 0.0603 |
| A_over_tier_gap | -0.0043 | -0.0166 | 0.0094 |
| A_Emerging_tpr_UEFA | 0.9287 | 0.9186 | 0.9389 |
| A_Emerging_fpr_UEFA | 0.1136 | 0.1005 | 0.1270 |
| A_Emerging_selection_rate_UEFA | 0.5206 | 0.5086 | 0.5328 |
| A_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| A_Emerging_tpr_nonUEFA | 0.9125 | 0.8904 | 0.9330 |
| A_Emerging_fpr_nonUEFA | 0.1331 | 0.1116 | 0.1546 |
| A_Emerging_selection_rate_nonUEFA | 0.4545 | 0.4325 | 0.4753 |
| A_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| A_Emerging_tpr_gap | -0.0162 | -0.0411 | 0.0071 |
| A_Emerging_fpr_gap | 0.0195 | -0.0057 | 0.0453 |
| A_Emerging_EOD | 0.0195 | 0.0067 | 0.0472 |
| A_Emerging_selection_rate_gap | -0.0660 | -0.0922 | -0.0415 |
| A_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| A_Established_tpr_UEFA | 0.7639 | 0.7407 | 0.7862 |
| A_Established_fpr_UEFA | 0.1137 | 0.1030 | 0.1245 |
| A_Established_selection_rate_UEFA | 0.3117 | 0.2988 | 0.3247 |
| A_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| A_Established_tpr_nonUEFA | 0.7551 | 0.7188 | 0.7899 |
| A_Established_fpr_nonUEFA | 0.1505 | 0.1286 | 0.1729 |
| A_Established_selection_rate_nonUEFA | 0.3683 | 0.3456 | 0.3924 |
| A_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| A_Established_tpr_gap | -0.0088 | -0.0509 | 0.0333 |
| A_Established_fpr_gap | 0.0367 | 0.0112 | 0.0624 |
| A_Established_EOD | 0.0367 | 0.0161 | 0.0631 |
| A_Established_selection_rate_gap | 0.0566 | 0.0304 | 0.0841 |
| A_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| A_Elite_tpr_UEFA | 0.6365 | 0.5997 | 0.6746 |
| A_Elite_fpr_UEFA | 0.0411 | 0.0346 | 0.0474 |
| A_Elite_selection_rate_UEFA | 0.1233 | 0.1145 | 0.1323 |
| A_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| A_Elite_tpr_nonUEFA | 0.5894 | 0.5259 | 0.6522 |
| A_Elite_fpr_nonUEFA | 0.0392 | 0.0287 | 0.0504 |
| A_Elite_selection_rate_nonUEFA | 0.1297 | 0.1143 | 0.1457 |
| A_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| A_Elite_tpr_gap | -0.0471 | -0.1199 | 0.0244 |
| A_Elite_fpr_gap | -0.0019 | -0.0144 | 0.0103 |
| A_Elite_EOD | 0.0471 | 0.0051 | 0.1199 |
| A_Elite_selection_rate_gap | 0.0064 | -0.0116 | 0.0249 |
| A_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| A_World Class_tpr_UEFA | 0.6454 | 0.5870 | 0.7052 |
| A_World Class_fpr_UEFA | 0.0074 | 0.0049 | 0.0100 |
| A_World Class_selection_rate_UEFA | 0.0444 | 0.0386 | 0.0504 |
| A_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| A_World Class_tpr_nonUEFA | 0.6489 | 0.5526 | 0.7400 |
| A_World Class_fpr_nonUEFA | 0.0071 | 0.0029 | 0.0115 |
| A_World Class_selection_rate_nonUEFA | 0.0475 | 0.0374 | 0.0575 |
| A_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| A_World Class_tpr_gap | 0.0035 | -0.1070 | 0.1103 |
| A_World Class_fpr_gap | -0.0002 | -0.0050 | 0.0048 |
| A_World Class_EOD | 0.0035 | 0.0028 | 0.1256 |
| A_World Class_selection_rate_gap | 0.0031 | -0.0087 | 0.0141 |
| A_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| A_ER1b_max_EOD | 0.0471 | 0.0269 | 0.1387 |
| B_error_rate_UEFA | 0.3256 | 0.3122 | 0.3388 |
| B_under_tier_rate_UEFA | 0.2139 | 0.2031 | 0.2246 |
| B_over_tier_rate_UEFA | 0.1117 | 0.1029 | 0.1210 |
| B_error_rate_nonUEFA | 0.3543 | 0.3316 | 0.3770 |
| B_under_tier_rate_nonUEFA | 0.2627 | 0.2440 | 0.2828 |
| B_over_tier_rate_nonUEFA | 0.0916 | 0.0775 | 0.1070 |
| B_ER1a_error_rate_gap | 0.0287 | 0.0012 | 0.0551 |
| B_under_tier_gap | 0.0488 | 0.0267 | 0.0712 |
| B_over_tier_gap | -0.0201 | -0.0371 | -0.0030 |
| B_Emerging_tpr_UEFA | 0.8346 | 0.8183 | 0.8503 |
| B_Emerging_fpr_UEFA | 0.2208 | 0.2034 | 0.2381 |
| B_Emerging_selection_rate_UEFA | 0.5273 | 0.5134 | 0.5409 |
| B_Emerging_base_rate_UEFA | 0.4993 | 0.4873 | 0.5116 |
| B_Emerging_tpr_nonUEFA | 0.8201 | 0.7901 | 0.8483 |
| B_Emerging_fpr_nonUEFA | 0.2332 | 0.2072 | 0.2609 |
| B_Emerging_selection_rate_nonUEFA | 0.4753 | 0.4519 | 0.4993 |
| B_Emerging_base_rate_nonUEFA | 0.4124 | 0.3890 | 0.4345 |
| B_Emerging_tpr_gap | -0.0145 | -0.0478 | 0.0170 |
| B_Emerging_fpr_gap | 0.0124 | -0.0193 | 0.0447 |
| B_Emerging_EOD | 0.0145 | 0.0049 | 0.0517 |
| B_Emerging_selection_rate_gap | -0.0520 | -0.0804 | -0.0238 |
| B_Emerging_base_rate_gap | -0.0869 | -0.1130 | -0.0610 |
| B_Established_tpr_UEFA | 0.5961 | 0.5692 | 0.6238 |
| B_Established_fpr_UEFA | 0.2228 | 0.2079 | 0.2381 |
| B_Established_selection_rate_UEFA | 0.3365 | 0.3226 | 0.3499 |
| B_Established_base_rate_UEFA | 0.3046 | 0.2914 | 0.3173 |
| B_Established_tpr_nonUEFA | 0.6141 | 0.5722 | 0.6542 |
| B_Established_fpr_nonUEFA | 0.2612 | 0.2348 | 0.2883 |
| B_Established_selection_rate_nonUEFA | 0.3884 | 0.3650 | 0.4111 |
| B_Established_base_rate_nonUEFA | 0.3603 | 0.3369 | 0.3844 |
| B_Established_tpr_gap | 0.0180 | -0.0309 | 0.0686 |
| B_Established_fpr_gap | 0.0384 | 0.0078 | 0.0705 |
| B_Established_EOD | 0.0384 | 0.0155 | 0.0757 |
| B_Established_selection_rate_gap | 0.0519 | 0.0246 | 0.0799 |
| B_Established_base_rate_gap | 0.0557 | 0.0286 | 0.0827 |
| B_Elite_tpr_UEFA | 0.3903 | 0.3507 | 0.4301 |
| B_Elite_fpr_UEFA | 0.0628 | 0.0555 | 0.0705 |
| B_Elite_selection_rate_UEFA | 0.1080 | 0.0992 | 0.1170 |
| B_Elite_base_rate_UEFA | 0.1381 | 0.1288 | 0.1475 |
| B_Elite_tpr_nonUEFA | 0.3862 | 0.3269 | 0.4480 |
| B_Elite_fpr_nonUEFA | 0.0568 | 0.0441 | 0.0693 |
| B_Elite_selection_rate_nonUEFA | 0.1110 | 0.0956 | 0.1263 |
| B_Elite_base_rate_nonUEFA | 0.1644 | 0.1477 | 0.1818 |
| B_Elite_tpr_gap | -0.0041 | -0.0738 | 0.0702 |
| B_Elite_fpr_gap | -0.0060 | -0.0205 | 0.0084 |
| B_Elite_EOD | 0.0060 | 0.0040 | 0.0829 |
| B_Elite_selection_rate_gap | 0.0030 | -0.0148 | 0.0209 |
| B_Elite_base_rate_gap | 0.0264 | 0.0066 | 0.0470 |
| B_World Class_tpr_UEFA | 0.3825 | 0.3230 | 0.4418 |
| B_World Class_fpr_UEFA | 0.0064 | 0.0042 | 0.0090 |
| B_World Class_selection_rate_UEFA | 0.0282 | 0.0236 | 0.0331 |
| B_World Class_base_rate_UEFA | 0.0580 | 0.0513 | 0.0648 |
| B_World Class_tpr_nonUEFA | 0.3617 | 0.2621 | 0.4607 |
| B_World Class_fpr_nonUEFA | 0.0029 | 0.0007 | 0.0057 |
| B_World Class_selection_rate_nonUEFA | 0.0254 | 0.0180 | 0.0334 |
| B_World Class_base_rate_nonUEFA | 0.0628 | 0.0515 | 0.0755 |
| B_World Class_tpr_gap | -0.0208 | -0.1328 | 0.0944 |
| B_World Class_fpr_gap | -0.0035 | -0.0071 | 0.0002 |
| B_World Class_EOD | 0.0208 | 0.0038 | 0.1370 |
| B_World Class_selection_rate_gap | -0.0028 | -0.0118 | 0.0062 |
| B_World Class_base_rate_gap | 0.0048 | -0.0090 | 0.0183 |
| B_ER1b_max_EOD | 0.0384 | 0.0295 | 0.1370 |
| AminusB_ER1a_error_rate_gap | 0.0069 | -0.0219 | 0.0358 |
| AminusB_ER1b_max_EOD | 0.0087 | -0.0768 | 0.0781 |
| AminusB_under_tier_gap | -0.0088 | -0.0300 | 0.0120 |
| AminusB_over_tier_gap | 0.0158 | -0.0022 | 0.0324 |

## strata_signed_log_gap

| stratum | n_nonUEFA | n_UEFA | flag | dropped_nonUEFA_share | A_signed_log_gap | A_ci95_low | A_ci95_high | B_signed_log_gap | B_ci95_low | B_ci95_high |
|---|---|---|---|---|---|---|---|---|---|---|
| all players | 1496 | 4324 |  | 0.0000 | 0.0986 | 0.0676 | 0.1284 | 0.1590 | 0.1163 | 0.2018 |
| minutes >= 900 (sensitivity) | 1331 | 3797 |  | 0.0000 | 0.0873 | 0.0556 | 0.1176 | 0.1480 | 0.1050 | 0.1911 |
| recent arrivals | 410 | 790 |  | 0.0000 | 0.1301 | 0.0611 | 0.1990 | 0.1801 | 0.0952 | 0.2710 |
| established (not recent arrivals) | 1086 | 3534 |  | 0.0000 | 0.0833 | 0.0489 | 0.1198 | 0.1308 | 0.0817 | 0.1795 |
| CAF vs UEFA | 675 | 4324 |  | 0.0000 | 0.0865 | 0.0458 | 0.1282 | 0.1239 | 0.0650 | 0.1846 |
| CONMEBOL vs UEFA | 533 | 4324 |  | 0.0000 | 0.1284 | 0.0796 | 0.1761 | 0.1857 | 0.1194 | 0.2531 |
| diaspora-born non-UEFA vs UEFA | 376 | 4324 |  | 0.0000 | 0.0648 | 0.0086 | 0.1166 | 0.0994 | 0.0247 | 0.1765 |
| other non-UEFA vs UEFA | 1120 | 4324 |  | 0.0000 | 0.1099 | 0.0749 | 0.1463 | 0.1790 | 0.1304 | 0.2274 |
| non-UEFA vs EU-mobile UEFA (exploratory) | 1496 | 3300 |  | 0.0000 | 0.0739 | 0.0358 | 0.1131 | 0.1398 | 0.0863 | 0.1946 |
| non-UEFA vs other UEFA (exploratory) | 1496 | 1024 |  | 0.0000 | 0.0709 | -0.0115 | 0.1513 | 0.0575 | -0.0354 | 0.1505 |
| position: Attack | 532 | 1051 |  | 0.0000 | 0.0957 | 0.0378 | 0.1551 | 0.1753 | 0.1038 | 0.2482 |
| position: Midfield | 395 | 1292 |  | 0.0000 | 0.0892 | 0.0311 | 0.1474 | 0.1484 | 0.0680 | 0.2331 |
| position: Defender | 508 | 1557 |  | 0.0000 | 0.1016 | 0.0479 | 0.1580 | 0.1659 | 0.0907 | 0.2394 |
| position: Goalkeeper | 61 | 424 |  | 0.0000 | 0.1309 | -0.0213 | 0.2888 | 0.0337 | -0.1388 | 0.2093 |

## league_signed_log_gap

| league | n_nonUEFA | n_UEFA | reporting | A_signed_log_gap | A_ci95_low | A_ci95_high | A_mae_UEFA | A_mae_nonUEFA | B_signed_log_gap | B_ci95_low | B_ci95_high | B_mae_UEFA | B_mae_nonUEFA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PO1 | 178 | 245 | league-level estimate | -0.0065 | -0.1083 | 0.0932 | 0.4142 | 0.4332 | -0.0886 | -0.2109 | 0.0380 | 0.5467 | 0.5914 |
| FR1 | 177 | 246 | league-level estimate | 0.0360 | -0.0562 | 0.1333 | 0.4102 | 0.4013 | 0.0467 | -0.0806 | 0.1863 | 0.6621 | 0.6993 |
| GB1 | 135 | 420 | league-level estimate | 0.0339 | -0.0660 | 0.1331 | 0.3933 | 0.3756 | 0.0464 | -0.1279 | 0.2076 | 1.0381 | 1.0347 |
| TR1 | 127 | 301 | league-level estimate | 0.2647 | 0.1499 | 0.3808 | 0.4794 | 0.4358 | 0.3795 | 0.2307 | 0.5274 | 0.6564 | 0.5653 |
| ES1 | 123 | 386 | league-level estimate | 0.0872 | -0.0178 | 0.1909 | 0.4188 | 0.4274 | 0.1019 | -0.0472 | 0.2408 | 0.5810 | 0.6176 |
| IT1 | 112 | 395 | league-level estimate | 0.0222 | -0.0845 | 0.1240 | 0.3876 | 0.4245 | 0.1438 | -0.0034 | 0.2944 | 0.6757 | 0.7634 |
| BE1 | 108 | 242 | league-level estimate | 0.1193 | 0.0092 | 0.2303 | 0.3831 | 0.3867 | 0.1681 | 0.0261 | 0.3102 | 0.5567 | 0.4970 |
| RU1 | 108 | 304 | league-level estimate | 0.2795 | 0.1602 | 0.4011 | 0.3810 | 0.4459 | 0.5277 | 0.3597 | 0.7013 | 0.5452 | 0.6782 |
| GR1 | 93 | 263 | pooled only (n < 100) | 0.2406 | 0.1204 | 0.3626 | 0.3648 | 0.4306 | 0.2319 | 0.0782 | 0.3941 | 0.5450 | 0.5453 |
| NL1 | 83 | 342 | pooled only (n < 100) | 0.0569 | -0.0563 | 0.1691 | 0.4215 | 0.3630 | 0.2059 | 0.0338 | 0.3832 | 0.8332 | 0.6816 |
| L1 | 80 | 371 | pooled only (n < 100) | 0.0160 | -0.0936 | 0.1239 | 0.3553 | 0.3702 | -0.0149 | -0.1754 | 0.1444 | 0.7600 | 0.7214 |
| UKR1 | 69 | 345 | pooled only (n < 100) | 0.1803 | 0.0605 | 0.2926 | 0.3312 | 0.3479 | 0.3959 | 0.2275 | 0.5639 | 1.0659 | 0.7517 |
| SC1 | 55 | 256 | pooled only (n < 100) | 0.1084 | -0.0888 | 0.3131 | 0.5450 | 0.5870 | 0.4044 | 0.1239 | 0.6940 | 1.0642 | 0.9618 |
| DK1 | 48 | 208 | pooled only (n < 100) | 0.0204 | -0.1790 | 0.2102 | 0.4319 | 0.4911 | 0.0011 | -0.2085 | 0.2066 | 0.6235 | 0.5822 |

## worst_errors

| model | set | n | nonUEFA_share_in_set | nonUEFA_share_overall |
|---|---|---|---|---|
| Model A | largest under-predictions (top 5%) | 291 | 0.3540 | 0.2570 |
| Model A | largest over-predictions (top 5%) | 291 | 0.1993 | 0.2570 |
| Model A | largest absolute errors (top 5%) | 291 | 0.2612 | 0.2570 |
| Model B | largest under-predictions (top 5%) | 291 | 0.2990 | 0.2570 |
| Model B | largest over-predictions (top 5%) | 291 | 0.1237 | 0.2570 |
| Model B | largest absolute errors (top 5%) | 291 | 0.2096 | 0.2570 |

## calibration_within_predicted_deciles

| model | predicted_decile | n_nonUEFA | n_UEFA | mean_res_UEFA | mean_res_nonUEFA | gap | ci95_low | ci95_high | dropped_nonUEFA_share |
|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 90.0000 | 492.0000 | -0.0151 | 0.0551 | 0.0702 |  |  |  |
| A | 2 | 141.0000 | 441.0000 | -0.0327 | 0.1498 | 0.1825 |  |  |  |
| A | 3 | 125.0000 | 457.0000 | -0.0853 | 0.0425 | 0.1277 |  |  |  |
| A | 4 | 147.0000 | 435.0000 | -0.0208 | 0.0535 | 0.0743 |  |  |  |
| A | 5 | 174.0000 | 408.0000 | -0.0355 | 0.0790 | 0.1144 |  |  |  |
| A | 6 | 158.0000 | 424.0000 | -0.0619 | 0.0099 | 0.0718 |  |  |  |
| A | 7 | 185.0000 | 397.0000 | -0.0245 | 0.1136 | 0.1381 |  |  |  |
| A | 8 | 160.0000 | 422.0000 | -0.0232 | 0.1199 | 0.1431 |  |  |  |
| A | 9 | 160.0000 | 422.0000 | 0.0721 | 0.1132 | 0.0411 |  |  |  |
| A | 10 | 156.0000 | 426.0000 | 0.0112 | 0.0510 | 0.0397 |  |  |  |
| A | ALL: stratified by predicted decile |  |  |  |  | 0.1012 | 0.0717 | 0.1307 | 0.0000 |
| A | ALL: stratified by league x predicted decile |  |  |  |  | 0.1052 | 0.0759 | 0.1362 | 0.0000 |
| B | 1 | 122.0000 | 460.0000 | -0.0223 | 0.0910 | 0.1133 |  |  |  |
| B | 2 | 125.0000 | 457.0000 | -0.0700 | 0.2943 | 0.3643 |  |  |  |
| B | 3 | 147.0000 | 435.0000 | -0.0845 | 0.1133 | 0.1978 |  |  |  |
| B | 4 | 164.0000 | 418.0000 | -0.1222 | 0.1836 | 0.3059 |  |  |  |
| B | 5 | 131.0000 | 451.0000 | -0.0574 | 0.2077 | 0.2651 |  |  |  |
| B | 6 | 154.0000 | 428.0000 | -0.0751 | 0.1326 | 0.2077 |  |  |  |
| B | 7 | 164.0000 | 418.0000 | -0.0319 | 0.0589 | 0.0908 |  |  |  |
| B | 8 | 179.0000 | 403.0000 | -0.0451 | 0.1455 | 0.1906 |  |  |  |
| B | 9 | 169.0000 | 413.0000 | -0.0094 | 0.1802 | 0.1896 |  |  |  |
| B | 10 | 141.0000 | 441.0000 | 0.0152 | 0.1704 | 0.1552 |  |  |  |
| B | ALL: stratified by predicted decile |  |  |  |  | 0.2060 | 0.1651 | 0.2444 | 0.0000 |
| B | ALL: stratified by league x predicted decile |  |  |  |  | 0.1674 | 0.1268 | 0.2080 | 0.0000 |

## robustness_all_algorithms

| algorithm | model | signed_gap_raw | signed_gap_league_stratified | mae_gap_raw | rmse_UEFA | rmse_nonUEFA |
|---|---|---|---|---|---|---|
| ridge | A | 0.1338 | 0.1320 | 0.0078 | 0.6028 | 0.6069 |
| ridge | B | 0.2637 | 0.1999 | -0.0538 | 1.0399 | 0.9849 |
| random_forest | A | 0.1571 | 0.1328 | -0.0136 | 0.6511 | 0.6329 |
| random_forest | B | 0.2280 | 0.1661 | -0.0621 | 1.0014 | 0.9374 |
| hgb | A | 0.1107 | 0.1059 | 0.0091 | 0.5376 | 0.5444 |
| hgb | B | 0.2130 | 0.1668 | -0.0585 | 0.9378 | 0.8763 |
| hgb_tuned | A | 0.1027 | 0.0986 | 0.0121 | 0.5266 | 0.5345 |
| hgb_tuned | B | 0.2055 | 0.1590 | -0.0543 | 0.9336 | 0.8741 |
