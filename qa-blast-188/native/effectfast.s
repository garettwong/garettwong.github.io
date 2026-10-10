.setcpu "6502"
.segment "CODE"
php
pha
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
pla
plp
cmp #0
beq original
lda $31
cmp #$60
bcs close
jsr $65cf
.byte 6
.word $966a
close:
jsr $65cf
.byte 6
.word $96a4
old:
pla
plp
original:
jsr $65cf
.byte 6
.word $961b
