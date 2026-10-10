.setcpu "6502"
.segment "CODE"
; Add the original displacement rawDuration extra times; total = rawDuration+1.
; This exactly preserves both signed 16-bit displacement endpoints modulo65536.
pha
lda $17
cmp #4
bne multiply
pla
rts
multiply:
pla
pha
txa
pha
lda $08
pha
lda $09
pha
lda $0a
pha
lda $0b
pha
lda $04
sta $08
lda $05
sta $09
lda $06
sta $0a
lda $07
sta $0b
tsx
lda $0106,x
tax
beq done
loop:
clc
lda $04
adc $08
sta $04
lda $05
adc $09
sta $05
clc
lda $06
adc $0a
sta $06
lda $07
adc $0b
sta $07
dex
bne loop
done:
pla
sta $0b
pla
sta $0a
pla
sta $09
pla
sta $08
pla
tax
pla
ldy $032c,x
rts
