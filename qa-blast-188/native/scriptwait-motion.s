.setcpu "6502"
.segment "CODE"
php
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
plp
lda $17
cmp #4
beq done
lda $0322,x
sec
sbc $03
clc
adc #2
tay
lda ($00),y
jsr $65cf
.byte $13, $00, $94
jmp $bff9
old:
plp
lda $17
cmp #4
beq done
jmp $bf9b
done: jmp $bff9
