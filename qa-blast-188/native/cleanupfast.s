.setcpu "6502"
.segment "CODE"
 lda $31
 bpl done
 pha
 lda $73fe
 cmp #$b5
 bne old
 lda $73c0
 beq old
 pla
 lda #$87
 sta $31
 inc $31
 rts
old:
 pla
 inc $31
done:
 rts
