.setcpu "6502"
.export safe_far,save_stub
.segment "CODE"
safe_far:
 sta $73cb
 sty $73cc
 pla
 sta $73cd
 pla
 sta $73ce
 ldy #6
@save:
 lda $18,y
 pha
 dey
 bpl @save
 lda $73cd
 sta $19
 lda $73ce
 sta $1a
 ldy #1
 lda ($19),y
 sta $18
 iny
 lda ($19),y
 sta $1b
 iny
 lda ($19),y
 sta $1c
 lda $4c
 pha
 lda $18
 jsr $d12f
 ldy $73cc
 lda $73cb
 jsr $d169
 sta $73cb
 sty $73cc
 pla
 jsr $d12f
 ldy #0
@restore:
 pla
 sta $18,y
 iny
 cpy #7
 bcc @restore
 ldy $73cc
 lda $73cb
 rts
save_stub:
 jsr safe_far
 .byte 18
 .word 0 ; fixed by builder
