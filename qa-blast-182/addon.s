.setcpu "6502"
.export finish_check,step,reset
.segment "CODE"
.byte 19
.res 15,0
ACTIVE=$73c0
GATE=$73fd
MODE=$73fe
LAST=$73ff
.macro far bank,addr
 jsr :+
 jmp :++
:
 jsr $c749
 .byte bank
 .word addr
:
.endmacro
finish_check:
 ; Keep previous group as a GLOBAL 0..79 index, even after reserve refill.
 lda $7370
 sta LAST
 sec
 lda $739a
 sbc $7372
 sta $12
 lda $739b
 sbc #0
 sta $13
@offset:
 lda $13
 bne @subtract
 lda $12
 cmp #5
 bcc @next
@subtract:
 sec
 lda $12
 sbc #5
 sta $12
 lda $13
 sbc #0
 sta $13
 inc LAST
 jmp @offset
@next:
 lda $7370
 pha
 lda ACTIVE
 pha
 far 18,$83ed
 pla
 sta $12
 pla
 sta $13
 lda MODE
 cmp #$b5
 bne @victory
 lda $12
 beq @victory
 lda ACTIVE
 beq @gate
 lda $7370
 cmp $13
 beq @victory
@gate:
 lda #1
 sta GATE
@victory:
 lda $10
 bne @attack
 far 18,$8491
 cpy #0
 bne @continue
 far 12,$aed6
 rts
@continue:
 far 12,$a8c3
 rts
@attack:
 far 12,$a8ec
 rts
reset:
 lda #0
 sta GATE
 sta MODE
 sta LAST
 far 18,$8648
 rts
step:
 lda MODE
 cmp #$b5
 bne @recover
 lda GATE
 beq @recover
 rts
@recover:
 lda $7371
 cmp #$a5
 bne @nail
 lda ACTIVE
 bne @nail
 lda $30
 cmp #2
 bcc @nail
 cmp #10
 bcs @nail
 bit $7b
 bvs @nail
 far 18,$8491
 cpy #0
 bne @nail
 far 12,$aed6
 rts
@nail:
 php
 txa
 pha
 lda $d9
 cmp #$42
 bne @normal
 lda $91
 cmp #2
 bne @normal
 lda $0200
 and #$bf
 cmp #8
 bne @normal
 lda $0202
 ora $0203
 bne @normal
 lda $30
 cmp #2
 beq @scan
 cmp #3
 beq @scan
 cmp #$22
 beq @scan
 cmp #$25
 bne @normal
@scan:
 ldx #$12
@party:
 lda $0200,x
 cmp #$40
 bcs @next
 lda $0202,x
 ora $0203,x
 bne @normal
@next:
 txa
 clc
 adc #$12
 tax
 cpx #$a2
 bcc @party
 lda #8
 sta $0200
 lda #1
 sta $0202
 lda $30
 cmp #$22
 beq @restart
 cmp #$25
 bne @normal
@restart:
 pla
 tax
 plp
 far 12,$a69f
 rts
@normal:
 pla
 tax
 plp
 lda $015d
 far 12,$838b
 rts
