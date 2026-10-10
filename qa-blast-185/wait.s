.setcpu "6502"
.segment "CODE"
jsr $87c8
pha
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
pla
lda #0
rts
old: pla
rts
