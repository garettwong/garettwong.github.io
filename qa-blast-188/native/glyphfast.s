.setcpu "6502"
.segment "CODE"
 pha
 lda $73fe
 cmp #$b5
 bne original
 lda $73c0
 beq original
 pla
 cmp #$e0
 bcs control
 inc $5f
 lda #0
 rts
control:
 pha
original:
 jsr $d2ae
 lda #2
 jsr $d2cc
 lda #4
 sta $0601,x
 lda $56
 sta $0602,x
 lda $57
 sta $0603,x
 pla
 rts
