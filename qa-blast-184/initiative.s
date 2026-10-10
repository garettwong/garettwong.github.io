.setcpu "6502"
.export choose_expanded
.segment "CODE"
; Called only by choose100's expanded-battle branch. Preserve its page,
; eligibility and tie rules, but compare the full selected defensive rank.
choose_expanded:
 jsr $60f4
 lda $12
 pha
 lda $13
 pha
 jsr $6f7f
 sta $7382
 ldx #0
@ally:
 lda $0200,x
 cmp #$40
 bcs @anext
 lda $020f,x
 beq @anext
 cmp #$1f
 beq @anext
 jsr $618a
 jsr $61d4
 bcc @anext
 sta $10
 stx $11
 lda $7400,x
 sta $7382
@anext:
 txa
 clc
 adc #18
 tax
 cmp #$a2
 bcc @ally
 lda #0
 sta $12
 lda #$72
 sta $13
 lda #0
 sta $7383
 sta $7381
 ldx #0
@enemy:
 lda $7383
 cmp #20
 bne :+
 lda #0
 sta $12
 lda #$76
 sta $13
:
 ldy #0
 lda ($12),y
 cmp #$40
 bcs @next
 ldy #15
 lda ($12),y
 beq @next
 cmp #$1f
 beq @next
 dey
 lda ($12),y
 lsr a
 lsr a
 lsr a
 lsr a
 cmp #15
 bne @compare
 ; Enemy sidecars are indexed by stored roster index, not current window.
 lda $7383
 asl a
 tay
 lda $7d81,y
 jsr $619c
@compare:
 jsr $61d4
 bcc @next
 beq @next
 sta $10
 stx $11
 inc $11
 lda $7381
 sta $7382
@next:
 clc
 lda $12
 adc #18
 sta $12
 bcc :+
 inc $13
:
 txa
 clc
 adc #18
 tax
 cmp #90
 bcc :+
 ldx #0
 inc $7381
:
 inc $7383
 lda $7383
 cmp $7372
 bcc @enemy
 ; Callers use nonzero $10 as "an actor was found". Encoded 256 is zero.
 lda $7ef3
 beq @load
 lda $10
 bne @load
 inc $10
@load:
 lda $7382
 jsr $60d7
 pla
 sta $13
 pla
 sta $12
 rts
